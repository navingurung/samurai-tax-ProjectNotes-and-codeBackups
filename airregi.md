```python

from fastapi import APIRouter, HTTPException, Depends, Query
from ..utils.encrypt import encrypt, decrypt
from ..models import Company, Shop
from ..dependencies import SessionDep
from sqlmodel import select
from typing import Any, Optional
from .auth import get_current_user_from_cookie
from pydantic import BaseModel, Field
import requests
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/airregi", tags=["airregi"])

# ─── Airレジ credentials from .env ────────────────────────────────────────────
# Unlike Smaregi, Airレジ does NOT use OAuth.
# Each store has its own static API Key + API Token.
# No shared client_id/client_secret — credentials are per store, provided by the merchant.
# TODO: Replace placeholder base URL once official Airレジ API spec is confirmed.
AIRREGI_API_BASE_URL = os.getenv("AIRREGI_API_BASE_URL") or ""


# ─── Schemas ──────────────────────────────────────────────────────────────────


class AirregiConnectRequest(BaseModel):
    api_key: str = Field(min_length=1, max_length=255)
    api_token: str = Field(min_length=1, max_length=255)


class AirregiStoreConnectRequest(BaseModel):
    store_id: str = Field(min_length=1, max_length=255)


# ─── Helpers ──────────────────────────────────────────────────────────────────


class AirregiAPIError(Exception):
    def __init__(self, status_code: int, detail: Any):
        self.status_code = status_code
        self.detail = detail
        super().__init__(str(detail))


def airregi_get(endpoint: str, api_key: str, api_token: str, params: dict = {}) -> requests.Response:
    """
    Make a GET request to the Airレジ API.
    Unlike Smaregi, there is no OAuth token refresh — credentials are static.
    If a 401 is returned, the merchant has revoked their token from the Airレジ backoffice.
    TODO: Update headers once official Airレジ API spec is confirmed.
    """
    if not AIRREGI_API_BASE_URL:
        raise AirregiAPIError(
            status_code=503,
            detail="Airレジ is not configured (missing AIRREGI_API_BASE_URL environment variable)",
        )
    try:
        response = requests.get(
            f"{AIRREGI_API_BASE_URL}{endpoint}",
            headers={
                "Authorization": f"Bearer {api_token}",
                "X-Airregi-Api-Key": api_key,  # TODO: confirm header name from official spec
            },
            params=params,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise AirregiAPIError(
            status_code=500,
            detail={"message": "Airレジ API request failed", "error": str(exc)},
        ) from exc
    return response


def get_credentials(company: Any) -> tuple[str, str]:
    """
    Decrypt and return the stored api_key and api_token for a company.
    Raises HTTPException 400 if not connected.
    """
    if not company.airregi_api_key_encrypted or not company.airregi_api_token_encrypted:
        raise HTTPException(status_code=400, detail="Company is not connected to Airレジ")
    return decrypt(company.airregi_api_key_encrypted), decrypt(company.airregi_api_token_encrypted)


# ─── Company endpoints ────────────────────────────────────────────────────────


@router.post("/connect", dependencies=[Depends(get_current_user_from_cookie)])
def connect_airregi(
    body: AirregiConnectRequest,
    company_id: int,
    session: SessionDep,
):
    """
    Connect a company to Airレジ.
    Admin enters the api_key and api_token from the Airレジ backoffice.
    Backend validates credentials by making a test API call to Airレジ.
    Saves encrypted api_key + api_token to the company row.

    Unlike Smaregi (OAuth), there is no token refresh needed — tokens are static
    until the merchant manually revokes them from their Airレジ backoffice.
    """
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Validate credentials with a test API call to Airレジ
    # TODO: Replace with the correct validation endpoint once official API spec is confirmed
    try:
        response = airregi_get("/stores", api_key=body.api_key, api_token=body.api_token)
    except AirregiAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid Airレジ API key or token")
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail="Failed to validate Airレジ credentials",
        )

    # Check for duplicate api_key across companies
    all_companies = session.exec(
        select(Company).where(
            Company.airregi_api_key_encrypted.is_not(None),  # type: ignore
            Company.id != company_id,
        )
    ).all()
    for c in all_companies:
        if decrypt(c.airregi_api_key_encrypted) == body.api_key:
            raise HTTPException(
                status_code=409,
                detail="This Airレジ API key is already connected to another company",
            )

    try:
        company.airregi_api_key_encrypted = encrypt(body.api_key)
        company.airregi_api_token_encrypted = encrypt(body.api_token)

        session.add(company)
        session.commit()
        session.refresh(company)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save Airレジ connection: {str(exc)}",
        ) from exc

    return {"status": "connected"}


@router.delete("/disconnect", dependencies=[Depends(get_current_user_from_cookie)])
def disconnect_airregi(
    company_id: int,
    session: SessionDep,
):
    """
    Disconnect a company from Airレジ.
    Clears the stored api_key and api_token from the company row.
    Note: This does NOT revoke the token in Airレジ — the merchant must do that
    manually from their Airレジ backoffice if needed.
    """
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company.airregi_api_key_encrypted = None
    company.airregi_api_token_encrypted = None

    session.add(company)
    session.commit()

    return {"status": "disconnected"}


# ─── Store list endpoint ──────────────────────────────────────────────────────


@router.get("/stores", dependencies=[Depends(get_current_user_from_cookie)])
def get_airregi_stores(
    company_id: int,
    session: SessionDep,
):
    """
    Fetch all stores from Airレジ for the connected company.
    Used to display a store list so the admin can select which store to link to a shop.
    TODO: Update response field mapping once official Airレジ API spec is confirmed.
    """
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    api_key, api_token = get_credentials(company)

    try:
        response = airregi_get("/stores", api_key=api_key, api_token=api_token)
    except AirregiAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    try:
        data = response.json()
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid response from Airレジ API")

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data)

    # TODO: Update field names (storeId, storeName) once official API spec is confirmed
    return [
        {"store_id": store.get("storeId"), "store_name": store.get("storeName")}
        for store in data
    ]


# ─── Shop store endpoints ─────────────────────────────────────────────────────


@router.post("/store/connect", dependencies=[Depends(get_current_user_from_cookie)])
def connect_store_airregi(
    body: AirregiStoreConnectRequest,
    shop_id: int,
    session: SessionDep,
):
    """
    Link a shop to a specific Airレジ store.
    Admin selects a store from the list returned by /airregi/stores.
    Parent company must already be connected to Airレジ.
    Validates that the store_id exists in their Airレジ account before saving.
    """
    shop = session.exec(select(Shop).where(Shop.id == shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Parent company must be connected first
    company = session.get(Company, shop.company_id)
    if not company or not company.airregi_api_key_encrypted:
        raise HTTPException(
            status_code=400, detail="Parent company is not connected to Airレジ"
        )

    # Check for duplicate store_id across shops
    clash = session.exec(
        select(Shop).where(
            Shop.airregi_store_id == body.store_id,
            Shop.id != shop_id,
        )
    ).first()
    if clash:
        raise HTTPException(
            status_code=409,
            detail="Another shop is already connected to this Airレジ store",
        )

    # Validate store_id exists in their Airレジ account
    api_key, api_token = get_credentials(company)
    try:
        response = airregi_get("/stores", api_key=api_key, api_token=api_token)
        stores = response.json()
    except AirregiAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    # TODO: Update field name once official API spec is confirmed
    valid_ids = [s.get("storeId") for s in stores]
    if body.store_id not in valid_ids:
        raise HTTPException(
            status_code=400,
            detail="Store ID does not exist in this company's Airレジ account",
        )

    shop.airregi_store_id = body.store_id
    shop.use_airregi = True

    session.add(shop)
    session.commit()
    session.refresh(shop)

    return {"status": "connected", "airregi_store_id": shop.airregi_store_id}


@router.delete("/store/disconnect", dependencies=[Depends(get_current_user_from_cookie)])
def disconnect_store_airregi(
    shop_id: int,
    session: SessionDep,
):
    """
    Remove the Airレジ store link from a shop.
    Clears airregi_store_id and sets use_airregi to False.
    """
    shop = session.exec(select(Shop).where(Shop.id == shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop.airregi_store_id = None
    shop.use_airregi = False

    session.add(shop)
    session.commit()

    return {"status": "disconnected", "shop_id": shop_id}


# ─── Transactions endpoint ────────────────────────────────────────────────────


@router.get("/transactions", dependencies=[Depends(get_current_user_from_cookie)])
def get_airregi_transactions(
    shop_id: int,
    session: SessionDep,
    # Search filters
    transaction_id: Optional[str] = Query(default=None, description="Search by transaction ID"),
    receipt_number: Optional[str] = Query(default=None, description="Search by receipt number"),
    # Date filters
    date_from: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
):
    """
    Fetch transactions from Airレジ for the linked store.
    Triggered by the refresh button — no background polling.
    Supports search by transaction_id or receipt_number, and date range filtering.
    TODO: Update query param names once official Airレジ API spec is confirmed.
    """
    shop = session.exec(select(Shop).where(Shop.id == shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    if not shop.use_airregi or not shop.airregi_store_id:
        raise HTTPException(status_code=400, detail="Shop is not connected to Airレジ")

    company = session.get(Company, shop.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    api_key, api_token = get_credentials(company)

    # Build query params
    # TODO: Update param names once official Airレジ API spec is confirmed
    params: dict = {"storeId": shop.airregi_store_id}
    if transaction_id:
        params["transactionId"] = transaction_id
    if receipt_number:
        params["receiptNumber"] = receipt_number
    if date_from:
        params["dateFrom"] = date_from
    if date_to:
        params["dateTo"] = date_to

    try:
        response = airregi_get(
            "/transactions",
            api_key=api_key,
            api_token=api_token,
            params=params,
        )
    except AirregiAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    # 401 means merchant revoked their token from Airレジ backoffice
    if response.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="Airレジ token has been revoked. Please reconnect from the Airレジ backoffice.",
        )

    try:
        data = response.json()
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid response from Airレジ API")

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data)

    return data

    ```
