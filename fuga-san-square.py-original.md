```python

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlmodel import select
from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime, timezone
from urllib.parse import urlencode
import requests
import secrets
import os
import json
from dotenv import load_dotenv
from ..dependencies import SessionDep
from ..models import Company, Shop
from ..utils.encrypt import encrypt, decrypt
from .auth import get_current_user_from_cookie

load_dotenv()

router = APIRouter(prefix="/square", tags=["square"])

SQUARE_APPLICATION_ID = os.getenv("SQUARE_APPLICATION_ID")
SQUARE_APPLICATION_SECRET = os.getenv("SQUARE_APPLICATION_SECRET")
SQUARE_REDIRECT_URI = os.getenv("SQUARE_REDIRECT_URI")
SQUARE_SCOPES = os.getenv("SQUARE_SCOPES")
SQUARE_VERSION = os.getenv("SQUARE_VERSION")
SQUARE_BASE_URL = os.getenv("SQUARE_BASE_URL")
DASHBOARD_URL = os.getenv("DASHBOARD_URL")

JsonDict = dict[str, Any]

TOKEN_REFRESH_BUFFER_SECONDS = 300


class SquareAPIError(Exception):
    def __init__(self, status_code: int, detail: Any):
        self.status_code = status_code
        self.detail = detail
        super().__init__(str(detail))


class OAuthUrlResponse(BaseModel):
    auth_url: str
    state: str


class MerchantConnectRequest(BaseModel):
    merchant_id: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_square_datetime(value: str) -> datetime:
    # Square returns UTC in ISO8601 format like 2026-06-21T04:22:02Z.
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Square datetime format: {value}",
        ) from exc


def get_required_str(data: JsonDict, key: str) -> str:
    value: object = data.get(key)
    if not isinstance(value, str) or not value:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required Square field: {key}",
        )
    return value


def _square_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
    }


def _handle_response(response: requests.Response) -> dict[str, Any]:
    try:
        data = response.json()
    except ValueError:
        data = {"message": response.text}

    if response.status_code >= 400:
        raise SquareAPIError(
            status_code=response.status_code,
            detail=data,
        )

    return data


def square_get(
    path: str,
    access_token: str,
    params: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    url = f"{SQUARE_BASE_URL}{path}"

    cleaned_params = {
        key: value for key, value in (params or {}).items() if value is not None
    }

    try:
        response = requests.get(
            f"{SQUARE_BASE_URL}{path}",
            headers=_square_headers(access_token),
            params={k: v for k, v in (params or {}).items() if v is not None},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise SquareAPIError(
            status_code=500,
            detail={"message": "Square request failed", "error": str(exc)},
        ) from exc

    return _handle_response(response)


def generate_unique_state(session: SessionDep) -> str:
    while True:
        state = secrets.token_urlsafe(16)
        exists = session.exec(
            select(Company).where(Company.square_oauth_state == state)
        ).first()
        if not exists:
            return state


def exchange_code_for_token(code: str) -> JsonDict:
    try:
        response = requests.post(
            f"{SQUARE_BASE_URL}/oauth2/token",
            json={
                "client_id": SQUARE_APPLICATION_ID,
                "client_secret": SQUARE_APPLICATION_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": SQUARE_REDIRECT_URI,
            },
            headers={
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise SquareAPIError(
            status_code=500,
            detail={"message": "Square token request failed", "error": str(exc)},
        ) from exc
    return _handle_response(response)


def refresh_square_token(refresh_token: str) -> JsonDict:
    try:
        response = requests.post(
            f"{SQUARE_BASE_URL}/oauth2/token",
            json={
                "client_id": SQUARE_APPLICATION_ID,
                "client_secret": SQUARE_APPLICATION_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            headers={
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise SquareAPIError(
            status_code=500,
            detail={"message": "Square token refresh failed", "error": str(exc)},
        ) from exc
    return _handle_response(response)


def ensure_valid_token(company: Any, session: Any) -> str:
    if not company.square_access_token_encrypted or not company.square_refresh_token_encrypted:
        raise HTTPException(
            status_code=400,
            detail="Company is not connected to Square",
        )

    needs_refresh = True
    if company.square_token_expires_at:
        expires_at = company.square_token_expires_at
        if expires_at.tzinfo is None:
            remaining = (expires_at - utc_now().replace(tzinfo=None)).total_seconds()
        else:
            remaining = (expires_at - utc_now()).total_seconds()
        needs_refresh = remaining <= TOKEN_REFRESH_BUFFER_SECONDS

    if needs_refresh:
        try:
            refresh_token = decrypt(company.square_refresh_token_encrypted)
            token_data = refresh_square_token(refresh_token)
        except SquareAPIError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

        access_token = token_data.get("access_token")
        expires_at_str = token_data.get("expires_at")

        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="Failed to refresh Square access token",
            )

        company.square_access_token_encrypted = encrypt(access_token)
        if expires_at_str:
            company.square_token_expires_at = parse_square_datetime(expires_at_str)
        company.square_last_refreshed_at = utc_now()

        session.add(company)
        session.commit()
        session.refresh(company)

    return decrypt(company.square_access_token_encrypted)


def get_merchant(access_token: str, merchant_id: str) -> JsonDict:
    return square_get(f"/v2/merchants/{merchant_id}", access_token)


# ── 1. GET /square/oauth ──────────────────────────────────────────────────────
@router.get("/oauth", response_model=OAuthUrlResponse, dependencies=[Depends(get_current_user_from_cookie)])
def get_square_oauth_url(company_id: int, session: SessionDep) -> OAuthUrlResponse:
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    state = generate_unique_state(session)

    try:
        company.square_oauth_state = state
        session.add(company)
        session.commit()
        session.refresh(company)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save OAuth state: {str(exc)}") from exc

    params = {
        "client_id": SQUARE_APPLICATION_ID,
        "scope": SQUARE_SCOPES,
        "session": "false",
        "state": state,
    }
    auth_url = f"{SQUARE_BASE_URL}/oauth2/authorize?{urlencode(params)}"
    return OAuthUrlResponse(auth_url=auth_url, state=state)


# ── 2. GET /square/oauth/callback ─────────────────────────────────────────────
@router.get("/oauth/callback")
def square_oauth_callback(
    session: SessionDep,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
) -> RedirectResponse:
    if error:
        return RedirectResponse(url=f"{DASHBOARD_URL}/account", status_code=302)
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code is missing")
    if not state:
        raise HTTPException(status_code=400, detail="State parameter is missing")

    try:
        token_json = exchange_code_for_token(code)
        merchant_id = get_required_str(token_json, "merchant_id")
        access_token = get_required_str(token_json, "access_token")
        refresh_token = get_required_str(token_json, "refresh_token")
        expires_at = parse_square_datetime(get_required_str(token_json, "expires_at"))

        merchant_json = get_merchant(access_token=access_token, merchant_id=merchant_id)

        company = session.exec(
            select(Company).where(Company.square_oauth_state == state)
        ).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found for given state")

        company.square_merchant_id = merchant_id
        company.square_access_token_encrypted = encrypt(access_token)
        company.square_refresh_token_encrypted = encrypt(refresh_token)
        company.square_token_expires_at = expires_at
        company.square_token_json_raw_encrypted = encrypt(json.dumps(token_json))
        company.square_merchant_json_raw_encrypted = encrypt(json.dumps(merchant_json))
        company.square_connected_at = utc_now()
        company.square_last_refreshed_at = utc_now()
        company.square_oauth_state = None
        session.add(company)
        session.commit()

    except SquareAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return RedirectResponse(url=f"{DASHBOARD_URL}/account", status_code=302)


# ── 3. GET /square/status ─────────────────────────────────────────────────────
@router.get("/status", dependencies=[Depends(get_current_user_from_cookie)])
def get_square_status(company_id: int, session: SessionDep):
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        "connected": company.square_merchant_id is not None,
        "merchant_id": company.square_merchant_id,
        "connected_at": company.square_connected_at,
        "last_refreshed_at": company.square_last_refreshed_at,
        "token_expires_at": company.square_token_expires_at,
    }


# ── 4. POST /square/company/connect ──────────────────────────────────────────
@router.post("/company/connect", dependencies=[Depends(get_current_user_from_cookie)])
def connect_company_square(
    body: MerchantConnectRequest,
    company_id: int,
    session: SessionDep,
):
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    merchant = session.exec(
        select(Company).where(Company.square_merchant_id == body.merchant_id)
    ).first()
    if not merchant:
        raise HTTPException(
            status_code=404,
            detail="Merchant ID not found. Client must complete Square OAuth first.",
        )

    try:
        access_token = decrypt(merchant.square_access_token_encrypted)
        get_merchant(access_token=access_token, merchant_id=body.merchant_id)
    except SquareAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    clash = session.exec(
        select(Company).where(
            Company.square_merchant_id == body.merchant_id,
            Company.id != company_id,
        )
    ).first()
    if clash:
        raise HTTPException(
            status_code=409,
            detail="This merchant_id is already connected to another company",
        )

    if merchant.id != company.id:
        company.square_merchant_id = merchant.square_merchant_id
        company.square_access_token_encrypted = merchant.square_access_token_encrypted
        company.square_refresh_token_encrypted = merchant.square_refresh_token_encrypted
        company.square_token_expires_at = merchant.square_token_expires_at
        company.square_token_json_raw_encrypted = merchant.square_token_json_raw_encrypted
        company.square_merchant_json_raw_encrypted = merchant.square_merchant_json_raw_encrypted
        company.square_connected_at = merchant.square_connected_at
        company.square_last_refreshed_at = merchant.square_last_refreshed_at

    session.add(company)
    session.commit()
    session.refresh(company)

    return {
        "status": "connected",
        "merchant_id": company.square_merchant_id,
        "connected_at": company.square_connected_at,
    }


# ── 5. DELETE /square/oauth/revoke ───────────────────────────────────────────
@router.delete("/oauth/revoke", dependencies=[Depends(get_current_user_from_cookie)])
def revoke_square_oauth(company_id: int, session: SessionDep):
    """Revoke token on Square's side + clear all Square data from DB."""
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    merchant_id = company.square_merchant_id

    if company.square_access_token_encrypted:
        try:
            access_token = decrypt(company.square_access_token_encrypted)
            requests.post(
                f"{SQUARE_BASE_URL}/oauth2/revoke",
                json={
                    "client_id": SQUARE_APPLICATION_ID,
                    "access_token": access_token,
                },
                headers={
                    "Authorization": f"Client {SQUARE_APPLICATION_SECRET}",
                    "Content-Type": "application/json",
                    "Square-Version": SQUARE_VERSION,
                },
                timeout=30,
            )
        except Exception:
            pass

    company.square_merchant_id = None
    company.square_access_token_encrypted = None
    company.square_refresh_token_encrypted = None
    company.square_token_expires_at = None
    company.square_token_json_raw_encrypted = None
    company.square_merchant_json_raw_encrypted = None
    company.square_connected_at = None
    company.square_last_refreshed_at = None
    company.square_oauth_state = None

    shops = session.exec(select(Shop).where(Shop.company_id == company_id)).all()
    for shop in shops:
        shop.square_location_id = None
        shop.use_square = False
        session.add(shop)

    session.add(company)
    session.commit()

    return {"status": "revoked", "merchant_id": merchant_id}


# ── 6. DELETE /square/disconnect ─────────────────────────────────────────────
@router.delete("/disconnect", dependencies=[Depends(get_current_user_from_cookie)])
def disconnect_square(company_id: int, session: SessionDep):
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    merchant_id = company.square_merchant_id

    company.square_merchant_id = None
    company.square_connected_at = None
    company.square_last_refreshed_at = None
    company.square_access_token_encrypted = None
    company.square_refresh_token_encrypted = None
    company.square_token_expires_at = None
    company.square_token_json_raw_encrypted = None
    company.square_merchant_json_raw_encrypted = None

    shops = session.exec(select(Shop).where(Shop.company_id == company_id)).all()
    for shop in shops:
        shop.square_location_id = None
        shop.use_square = False
        session.add(shop)

    session.add(company)
    session.commit()

    return {"status": "disconnected", "merchant_id": merchant_id}


# ── 7. GET /square/locations ──────────────────────────────────────────────────
@router.get("/locations", dependencies=[Depends(get_current_user_from_cookie)])
def get_square_locations(company_id: int, session: SessionDep):
    company = session.exec(select(Company).where(Company.id == company_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    access_token = ensure_valid_token(company, session)

    try:
        data = square_get("/v2/locations", access_token)
    except SquareAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return [
        {
            "location_id": loc.get("id"),
            "name": loc.get("name"),
            "address": loc.get("address"),
            "status": loc.get("status"),
        }
        for loc in data.get("locations", [])
    ]


# ── 8. POST /square/shop/connect ──────────────────────────────────────────────
@router.post("/shop/connect", dependencies=[Depends(get_current_user_from_cookie)])
def connect_shop_square(shop_id: int, location_id: str, session: SessionDep):
    shop = session.exec(select(Shop).where(Shop.id == shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    company = session.get(Company, shop.company_id)
    if not company or not company.square_merchant_id:
        raise HTTPException(status_code=400, detail="Parent company is not connected to Square")

    clash = session.exec(
        select(Shop).where(
            Shop.square_location_id == location_id,
            Shop.id != shop_id,
        )
    ).first()
    if clash:
        raise HTTPException(status_code=409, detail="Another shop is already connected to this Square location")

    access_token = ensure_valid_token(company, session)
    try:
        data = square_get("/v2/locations", access_token)
    except SquareAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    valid_ids = [loc.get("id") for loc in data.get("locations", [])]
    if location_id not in valid_ids:
        raise HTTPException(status_code=400, detail="Location ID does not exist in this company's Square account")

    shop.square_location_id = location_id
    shop.use_square = True

    session.add(shop)
    session.commit()
    session.refresh(shop)

    return {
        "status": "connected",
        "shop_id": shop_id,
        "square_location_id": shop.square_location_id,
    }


# ── 9. DELETE /square/shop/disconnect ────────────────────────────────────────
@router.delete("/shop/disconnect", dependencies=[Depends(get_current_user_from_cookie)])
def disconnect_shop_square(shop_id: int, session: SessionDep):
    shop = session.exec(select(Shop).where(Shop.id == shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop.square_location_id = None
    shop.use_square = False

    session.add(shop)
    session.commit()

    return {"status": "disconnected", "shop_id": shop_id}


# ── 10. GET /square/shop/status ──────────────────────────────────────────────
@router.get("/shop/status", dependencies=[Depends(get_current_user_from_cookie)])
def get_shop_status(shop_id: int, session: SessionDep):
    shop = session.exec(select(Shop).where(Shop.id == shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {
        "connected": shop.use_square and shop.square_location_id is not None,
        "square_location_id": shop.square_location_id,
        "shop_id": shop.id,
        "shop_name": shop.shop_name,
    }


# ── 11. GET /square/merchants ─────────────────────────────────────────────────
@router.get("/merchants", dependencies=[Depends(get_current_user_from_cookie)])
def get_available_merchants(session: SessionDep):
    """Return merchant_ids saved in DB from OAuth callbacks for autocomplete."""
    companies = session.exec(
        select(Company).where(Company.square_merchant_id != None)
    ).all()
    return [
        {
            "merchant_id": c.square_merchant_id,
            "connected_at": c.square_connected_at,
        }
        for c in companies
    ]


```
