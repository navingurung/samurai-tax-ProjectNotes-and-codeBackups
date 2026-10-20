from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac as hmac_lib
import logging
from typing import Annotated, Any
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from sqlmodel import select
from jose import jwt
import requests
import os
from dotenv import load_dotenv

from ..dependencies import SessionDep
from ..models import Company, Shop, ShopifyStore
from ..utils.encrypt import encrypt, decrypt
from ..utils.shopify_staff_links import delete_links
from .auth import get_current_user_from_cookie

load_dotenv()

router = APIRouter(prefix="/shopify", tags=["shopify"])
logger = logging.getLogger(__name__)

CurrentUser = Annotated[dict, Depends(get_current_user_from_cookie)]

# ─── Config ─────────────────────────────────────────────────────────────────
SHOPIFY_CLIENT_ID = os.getenv("SHOPIFY_CLIENT_ID") or ""
SHOPIFY_CLIENT_SECRET = os.getenv("SHOPIFY_CLIENT_SECRET") or ""
SHOPIFY_API_VERSION = os.getenv("SHOPIFY_API_VERSION") or ""
DASHBOARD_URL = os.getenv("DASHBOARD_URL") or ""

# Buffer before actual expiry at which we treat a stored access token as
# stale and proactively refresh it. Matches the pattern used by Square.
TOKEN_REFRESH_BUFFER_SECONDS = 300


class ShopifyAPIError(Exception):
    """Raised when a call to Shopify's OAuth endpoint fails, so route
    handlers can translate it into a clean HTTPException."""

    def __init__(self, status_code: int, detail: Any):
        self.status_code = status_code
        self.detail = detail
        super().__init__(str(detail))


# ─── Schemas ────────────────────────────────────────────────────────────────
class ExchangeTokenRequest(BaseModel):
    session_token: str | None = None


class LinkShopifyStoreRequest(BaseModel):
    shop_domain: str
    company_id: int


class UnlinkShopifyStoreRequest(BaseModel):
    shopify_store_id: int


# ─── Helpers ────────────────────────────────────────────────────────────────
def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def verify_app_load_hmac(query_params: dict) -> bool:
    """
    Confirms a GET to /shopify/app genuinely came from Shopify's admin
    iframe loader, not a forged request. Shopify signs every query string
    it sends with our client secret; we recompute the same signature and
    compare it in constant time to avoid timing attacks.
    """
    params = {k: v for k, v in query_params.items() if k != "hmac"}
    received_hmac = query_params.get("hmac", "")

    sorted_params = urlencode(sorted(params.items()))
    computed_hmac = hmac_lib.new(
        SHOPIFY_CLIENT_SECRET.encode(),
        sorted_params.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac_lib.compare_digest(computed_hmac, received_hmac)


def verify_webhook_hmac(body: bytes, hmac_header: str) -> bool:
    """
    Confirms an inbound webhook body genuinely came from Shopify. Shopify
    signs the raw request body (base64-encoded HMAC-SHA256) using our
    client secret; we recompute it ourselves and compare in constant time.
    Required for every webhook receiver — without this, anyone could POST
    a fake "app uninstalled" or "shop redact" event to our endpoint.
    """
    if not SHOPIFY_CLIENT_SECRET:
        return False

    if not hmac_header:
        return False
    digest = hmac_lib.new(SHOPIFY_CLIENT_SECRET.encode(), body, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode()
    return hmac_lib.compare_digest(computed_hmac, hmac_header)


def verify_session_token(token: str) -> dict:
    """
    Decodes and verifies the App Bridge session token sent by our embedded
    admin page. This is how Shopify proves "this request really is coming
    from inside your app, loaded in our admin" — the token is signed with
    our client secret and scoped to our client ID as audience.

    Uses python-jose (not PyJWT) to match the JWT library already relied
    on elsewhere in this codebase (see auth.py's cookie-based session
    tokens) rather than introducing a second, redundant JWT dependency.
    """
    return jwt.decode(
        token,
        SHOPIFY_CLIENT_SECRET,
        algorithms=["HS256"],
        audience=SHOPIFY_CLIENT_ID,
        options={"leeway": 60},  # tolerate small clock drift between servers
    )


def extract_shop_domain(claims: dict) -> str | None:
    """Pulls the *.myshopify.com shop domain out of verified session-token
    claims. Shopify puts it in either `dest` or `iss` depending on token
    type, so we check both."""
    for claim_key in ("dest", "iss"):
        raw = claims.get(claim_key)
        if not isinstance(raw, str):
            continue
        host = (urlparse(raw).hostname or "").lower().strip()
        if host.endswith(".myshopify.com"):
            return host
    return None


def exchange_session_token(shop_domain: str, session_token: str) -> dict:
    """
    Trades the short-lived App Bridge session token for a real, longer-lived
    offline access token — the credential we persist and would eventually
    use for Admin API calls. This hits Shopify's OAuth token endpoint
    directly; it is NOT part of the Admin API and is unaffected by the
    GraphQL-only requirement that applies to Admin API data calls.

    Requests an *expiring* offline token (expiring=1), matching Shopify's
    mandatory security requirement for public apps created after April 1,
    2026 — non-expiring tokens are being phased out entirely.
    """
    url = f"https://{shop_domain}/admin/oauth/access_token"
    payload = {
        "client_id": SHOPIFY_CLIENT_ID,
        "client_secret": SHOPIFY_CLIENT_SECRET,
        "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
        "subject_token": session_token,
        "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
        "requested_token_type": "urn:shopify:params:oauth:token-type:offline-access-token",
        "expiring": "1",
    }

    try:
        response = requests.post(url, data=payload, timeout=30)
    except requests.RequestException as exc:
        raise ShopifyAPIError(
            status_code=500,
            detail={
                "message": "Shopify token exchange request failed",
                "error": str(exc),
            },
        ) from exc

    try:
        data = response.json()
    except ValueError:
        data = {"message": response.text}

    if response.status_code >= 400:
        raise ShopifyAPIError(status_code=response.status_code, detail=data)

    return data


def refresh_access_token(shop_domain: str, refresh_token: str) -> dict:
    """
    Uses a stored refresh token to obtain a new (expiring) access token
    without merchant interaction. Same OAuth token endpoint as the initial
    exchange, different grant_type.

    IMPORTANT: Shopify allows only one *live refreshable* expiring token
    per app per store. When a refresh succeeds, Shopify invalidates the
    refresh token that was just used, so multiple services refreshing for
    the same store can race and invalidate each other's tokens; ensure a
    single refresher or shared storage/locking strategy per store.
    """
    url = f"https://{shop_domain}/admin/oauth/access_token"
    payload = {
        "client_id": SHOPIFY_CLIENT_ID,
        "client_secret": SHOPIFY_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }

    try:
        response = requests.post(url, data=payload, timeout=30)
    except requests.RequestException as exc:
        raise ShopifyAPIError(
            status_code=500,
            detail={
                "message": "Shopify token refresh request failed",
                "error": str(exc),
            },
        ) from exc

    try:
        data = response.json()
    except ValueError:
        data = {"message": response.text}

    if response.status_code >= 400:
        raise ShopifyAPIError(status_code=response.status_code, detail=data)

    return data


def ensure_valid_shopify_token(store: ShopifyStore, session: SessionDep) -> str:
    """
    Returns a usable (decrypted) access token for this store, refreshing
    it first if it's expired or close to expiring. Mirrors square.py's
    ensure_valid_token() — the same lazy check-then-refresh pattern,
    adapted for Shopify's 60-minute access token / 90-day refresh token
    lifetimes.
    """
    if (
        not store.shopify_access_token_encrypted
        or not store.shopify_refresh_token_encrypted
    ):
        raise HTTPException(
            status_code=400,
            detail="Shopify store is not connected",
        )

    needs_refresh = True
    if store.access_token_expires_at:
        remaining = (
            store.access_token_expires_at - utc_now().replace(tzinfo=None)
        ).total_seconds()
        needs_refresh = remaining <= TOKEN_REFRESH_BUFFER_SECONDS

    if needs_refresh:
        try:
            refresh_token = decrypt(store.shopify_refresh_token_encrypted)
            token_data = refresh_access_token(store.shopify_shop_domain, refresh_token)
        except ShopifyAPIError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

        access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        refresh_expires_in = token_data.get("refresh_token_expires_in")

        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="Failed to refresh Shopify access token",
            )

        now = utc_now().replace(tzinfo=None)
        store.shopify_access_token_encrypted = encrypt(access_token)
        if new_refresh_token:
            store.shopify_refresh_token_encrypted = encrypt(new_refresh_token)
        store.access_token_expires_at = (
            now + timedelta(seconds=expires_in) if expires_in else None
        )
        store.refresh_token_expires_at = (
            now + timedelta(seconds=refresh_expires_in) if refresh_expires_in else None
        )

        session.add(store)
        session.commit()
        session.refresh(store)

    return decrypt(store.shopify_access_token_encrypted)


def shopify_graphql(
    shop_domain: str, access_token: str, query: str, variables: dict | None = None
) -> dict:
    """
    POSTs a query to Shopify's GraphQL Admin API. Used only for fetching
    live location data — the one piece of Admin API data this backend
    needs directly for the shop-page location picker. GraphQL returns
    HTTP 200 even when the query itself failed, so query-level errors
    (in the `errors` array) are checked separately from HTTP failures.
    """
    url = f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }
    payload = {"query": query, "variables": variables or {}}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
    except requests.RequestException as exc:
        raise ShopifyAPIError(
            status_code=500,
            detail={"message": "Shopify GraphQL request failed", "error": str(exc)},
        ) from exc

    try:
        body = response.json()
    except ValueError:
        body = {"message": response.text}

    if response.status_code >= 400:
        raise ShopifyAPIError(status_code=response.status_code, detail=body)

    if body.get("errors"):
        raise ShopifyAPIError(status_code=502, detail=body["errors"])

    return body.get("data") or {}


# Fetches this store's physical POS locations. legacyResourceId is what we
# persist to Shop.shopify_location_id_public, matching the plain-integer
# style already used by the rest of this schema (see project notes on
# legacyResourceId keeping compatibility with the existing DB schema).
LOCATIONS_QUERY = """
query getLocations($first: Int!) {
  locations(first: $first) {
    edges {
      node {
        legacyResourceId
        name
        isActive
      }
    }
  }
}
"""


def _myshopify_host(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    host = (urlparse(value).hostname or "").lower().strip()
    return host if host.endswith(".myshopify.com") else None


def verify_embedded_session_token(token: str) -> tuple[str, int]:
    """
    Strict check for session tokens sent by the embedded dashboard (SAM-610).
    On top of verify_session_token (signature, exp, nbf, aud), Shopify
    requires `iss` and `dest` to point to the same shop. Also requires `sub`
    (the Shopify staff ID), which identifies the staff link.
    The install/OAuth flow keeps using verify_session_token unchanged.

    Returns (shop_domain, shopify_user_id). Raises 401 on any failure, with
    one generic message so callers can't tell which check failed.
    """
    invalid = HTTPException(status_code=401, detail="Invalid session token")
    try:
        claims = verify_session_token(token)
    except jwt.JWTError:
        raise invalid

    iss_host = _myshopify_host(claims.get("iss"))
    dest_host = _myshopify_host(claims.get("dest"))
    if not iss_host or iss_host != dest_host:
        raise invalid

    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub.isdigit():
        raise invalid

    return iss_host, int(sub)


# ─── Routes ─────────────────────────────────────────────────────────────────


# ── 1. GET /shopify/app ───────────────────────────────────────────────────
@router.get("/app", response_class=HTMLResponse)
def shopify_app(request: Request):
    """
    Entry point Shopify loads inside its admin iframe when a merchant opens
    or just installed the app. Verifies the request is genuinely from
    Shopify, then serves a small page that silently exchanges the App
    Bridge session token for an access token before handing off to our
    dashboard (also iframed).

    Public endpoint by necessity — Shopify calls this directly with no
    opportunity to attach our own auth cookie. HMAC verification is what
    replaces cookie auth here.
    """
    params = dict(request.query_params)

    if not verify_app_load_hmac(params):
        raise HTTPException(status_code=400, detail="Invalid hmac")

    shop_domain = params.get("shop", "").lower().strip()
    if not shop_domain.endswith(".myshopify.com"):
        raise HTTPException(status_code=400, detail="Invalid shop")

    # The dashboard iframe asks this page for session tokens (SAM-612), so
    # messages are only exchanged with the dashboard's exact origin.
    parsed_dashboard = urlparse(DASHBOARD_URL)
    dashboard_origin = f"{parsed_dashboard.scheme}://{parsed_dashboard.netloc}"

    # CSP frame-ancestors is required by Shopify App Store review — without
    # it, the page is vulnerable to clickjacking and will fail review.
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta name="shopify-api-key" content="{SHOPIFY_CLIENT_ID}" />
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <style>
        html, body {{ margin: 0; padding: 0; height: 100%; }}
        .loading-wrap {{
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
        }}
        .spinner {{
            width: 44px;
            height: 44px;
            border: 4px solid #e5e7eb;
            border-top-color: #164d86;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
        }}
        @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
        iframe {{ width: 100%; height: 100vh; border: none; display: none; }}
    </style>
    </head>
    <body>
    <div id="loading" class="loading-wrap"><div class="spinner"></div></div>
    <iframe id="dashboard"></iframe>
    <script>
        // SAM-612: answer session-token requests from the dashboard iframe.
        // App Bridge only works in this frame, so the dashboard asks us.
        const DASHBOARD_ORIGIN = '{dashboard_origin}';
        const dashboardFrame = document.getElementById('dashboard');

        window.addEventListener('message', async (event) => {{
            // Only our own dashboard iframe may ask, and only for this message type.
            if (event.origin !== DASHBOARD_ORIGIN) return;
            if (event.source !== dashboardFrame.contentWindow) return;
            const data = event.data;
            if (!data || data.type !== 'samurai:id-token:request') return;
            if (typeof data.requestId !== 'string') return;

            const reply = (payload) => event.source.postMessage(
                {{ type: 'samurai:id-token:response', requestId: data.requestId, ...payload }},
                DASHBOARD_ORIGIN
            );
            try {{
                reply({{ token: await window.shopify.idToken() }});
            }} catch (err) {{
                reply({{ error: 'Failed to get session token' }});
            }}
        }});
        async function connect() {{
            try {{
                const sessionToken = await window.shopify.idToken();
                const res = await fetch('/shopify/auth/token', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionToken
                    }},
                    body: JSON.stringify({{ session_token: sessionToken }})
                }});
                const data = await res.json();
                if (data.connected) {{
                    document.getElementById('loading').style.display = 'none';
                    const iframe = document.getElementById('dashboard');
                    iframe.src = '{DASHBOARD_URL}/login';
                    iframe.style.display = 'block';
                }} else {{
                    document.getElementById('loading').innerText = 'Connection failed';
                }}
            }} catch (err) {{
                document.getElementById('loading').innerText = 'Connection failed: ' + err.message;
            }}
        }}
        connect();
    </script>
    </body>
    </html>
    """
    return HTMLResponse(
        content=html,
        headers={
            "Content-Security-Policy": (
                f"frame-ancestors https://{shop_domain} https://admin.shopify.com;"
            )
        },
    )


# ── 2. POST /shopify/auth/token ───────────────────────────────────────────
@router.post("/auth/token")
def exchange(
    request: Request,
    session: SessionDep,
    body: ExchangeTokenRequest | None = None,
):
    """
    Verifies the session token sent by our embedded page, exchanges it for
    a real (expiring, offline) access token, and persists it on the
    matching ShopifyStore row — creating one if this shop has never
    connected before.

    Public endpoint — trust is established via the session token itself
    (verified below), not a cookie. Accepts the token via Authorization
    header (what the /shopify/app page sends) or JSON body, as a fallback.

    Does NOT register any webhooks. Webhook subscriptions (compliance,
    uninstall, POS order events) are configured once, app-wide, via
    shopify.app.toml — not per-store at connect time.
    """
    authorization = request.headers.get("Authorization", "")
    session_token = authorization.removeprefix("Bearer ").strip()
    if not session_token and body is not None:
        session_token = body.session_token

    if not session_token:
        raise HTTPException(status_code=400, detail="Missing session_token")

    try:
        claims = verify_session_token(session_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session token")

    shop_domain = extract_shop_domain(claims)
    if not shop_domain:
        raise HTTPException(status_code=400, detail="Invalid token claims")

    store = session.exec(
        select(ShopifyStore).where(ShopifyStore.shopify_shop_domain == shop_domain)
    ).first()

    # Already connected with a still-valid token — nothing to do. Avoids
    # hitting Shopify's OAuth endpoint on every page load/refresh.
    if (
        store
        and store.shopify_access_token_encrypted
        and store.disconnected_at is None
        and (
            store.access_token_expires_at is None
            or store.access_token_expires_at
            > utc_now().replace(tzinfo=None) + timedelta(seconds=60)
        )
    ):
        return JSONResponse({"connected": True})

    try:
        token_data = exchange_session_token(shop_domain, session_token)
    except ShopifyAPIError as exc:
        logger.error(
            "[shopify token exchange error] shop=%s status=%s detail=%s",
            shop_domain,
            exc.status_code,
            exc.detail,
        )
        raise HTTPException(
            status_code=502, detail="Unable to connect to Shopify"
        ) from exc

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=502, detail="Shopify did not return an access token"
        )

    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    refresh_expires_in = token_data.get("refresh_token_expires_in")
    scopes = token_data.get("scope", "")

    now = utc_now().replace(tzinfo=None)

    if not store:
        store = ShopifyStore(shopify_shop_domain=shop_domain)

    store.shopify_access_token_encrypted = encrypt(access_token)
    store.shopify_refresh_token_encrypted = (
        encrypt(refresh_token) if refresh_token else None
    )
    store.scopes = scopes
    store.access_token_expires_at = (
        now + timedelta(seconds=expires_in) if expires_in else None
    )
    store.refresh_token_expires_at = (
        now + timedelta(seconds=refresh_expires_in) if refresh_expires_in else None
    )
    store.connected_at = now
    store.disconnected_at = None

    session.add(store)
    session.commit()

    return JSONResponse({"connected": True})


# ── 3. POST /shopify/link-shopify-store ───────────────────────────────────
@router.post("/link-shopify-store")
def link_shopify_store(
    body: LinkShopifyStoreRequest,
    current_user: CurrentUser,
    session: SessionDep,
):
    """
    Links an already-installed Shopify store to a SAMURAI TAX company,
    once an admin has picked the company on the connect page.

    Refuses to steal a store already linked to a *different* company
    (409) — re-linking the same company is a harmless no-op success.
    """
    store = session.exec(
        select(ShopifyStore).where(ShopifyStore.shopify_shop_domain == body.shop_domain)
    ).first()
    if not store:
        raise HTTPException(
            status_code=404, detail="Shop not found — install app first"
        )

    company = session.get(Company, body.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if store.company_id is not None and store.company_id != company.id:
        raise HTTPException(
            status_code=409,
            detail="Shopify store is already linked to a different company",
        )

    store.company_id = company.id
    session.add(store)
    session.commit()

    return {"linked": True, "company_id": company.id}


# ── 4. POST /shopify/unlink-shopify-store ─────────────────────────────────
@router.post("/unlink-shopify-store")
def unlink_shopify_store(
    body: UnlinkShopifyStoreRequest,
    current_user: CurrentUser,
    session: SessionDep,
):
    """
    Disconnects a Shopify store from its Company. Also clears the
    public-app Shopify fields on any Shop still pointing at this store,
    since a shop can't stay linked to a location on a store that's no
    longer linked to its company.

    Only touches the *_public columns — never the legacy
    shopify_location_id / use_shopify fields, which belong to the
    existing (unrelated) flow.
    """
    store = session.get(ShopifyStore, body.shopify_store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Shopify store not found")

    shops = session.exec(select(Shop).where(Shop.shopify_store_id == store.id)).all()
    for shop in shops:
        shop.shopify_store_id = None
        shop.shopify_location_id_public = None
        shop.use_shopify_public = False
        session.add(shop)

    store.company_id = None
    session.add(store)
    session.commit()

    return {"unlinked": True}


# ── 5. GET /shopify/stores/available-to-connect ───────────────────────────
@router.get("/stores/available-to-connect")
def get_available_to_connect_stores(current_user: CurrentUser, session: SessionDep):
    """
    Lists Shopify stores that completed OAuth install but aren't yet
    linked to a Company — populates the "pick a company" step on the
    connect page.
    """
    stores = session.exec(
        select(ShopifyStore).where(
            ShopifyStore.company_id.is_(None),
            ShopifyStore.disconnected_at.is_(None),
        )
    ).all()

    return [
        {
            "id": store.id,
            "shopify_shop_domain": store.shopify_shop_domain,
            "connected_at": store.connected_at,
        }
        for store in stores
    ]


# ── 6. GET /shopify/stores/by-company/{company_id} ────────────────────────
@router.get("/stores/by-company/{company_id}")
def get_store_by_company(
    company_id: int, current_user: CurrentUser, session: SessionDep
):
    """
    Lists every Shopify store currently linked to a company — a company
    can have more than one (see ShopifyStore model comment). Pure DB
    read, no Shopify API call needed, so this can't fail due to Shopify
    being unreachable and costs nothing on every page view.

    Returns an empty list if the company has no linked stores.
    """
    stores = session.exec(
        select(ShopifyStore).where(ShopifyStore.company_id == company_id)
    ).all()

    return [
        {
            "id": store.id,
            "shopify_shop_domain": store.shopify_shop_domain,
            "connected_at": store.connected_at,
        }
        for store in stores
    ]


# ── 7. POST /shopify/webhooks/app/uninstalled ──────────────────────────────
@router.post("/webhooks/app/uninstalled")
async def app_uninstalled(request: Request, session: SessionDep):
    """
    Shopify calls this the moment a merchant uninstalls the app. Clears the
    now-dead token so we stop trying to use it, and marks the store
    disconnected.

    Public endpoint, authenticated via HMAC signature instead of a cookie —
    Shopify has no way to attach ours. Always returns 200 once the HMAC
    check passes, even if internal processing fails, so Shopify doesn't
    endlessly retry a webhook we've already logged for investigation.
    """
    body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")

    if not verify_webhook_hmac(body, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    shop_domain = request.headers.get("X-Shopify-Shop-Domain")

    try:
        store = session.exec(
            select(ShopifyStore).where(ShopifyStore.shopify_shop_domain == shop_domain)
        ).first()
        if store:
            store.shopify_access_token_encrypted = None
            store.shopify_refresh_token_encrypted = None
            store.disconnected_at = utc_now().replace(tzinfo=None)
            session.add(store)
            session.commit()
            # SAM-611: staff links for this store are no longer valid.
            delete_links(shopify_store_id=store.id)
    except Exception:
        logger.exception("Failed to process app/uninstalled for shop %s", shop_domain)

    return JSONResponse({"received": True})


# ── 8. POST /shopify/webhooks/compliance ───────────────────────────────────
@router.post("/webhooks/compliance")
async def compliance_webhook(request: Request, session: SessionDep):
    """
    Handles all 3 mandatory GDPR/CCPA compliance topics in one endpoint,
    distinguished by the X-Shopify-Topic header:
      - customers/data_request: a customer asked what data we hold on them
      - customers/redact: a customer asked us to delete their data
      - shop/redact: the shop itself must be purged (required within 48h
        of uninstall, per Shopify's App Store requirements)

    Required for every public app — Shopify's review team tests these
    webhooks directly, and a non-functional handler is one of the most
    common first-time submission rejection reasons.
    """
    body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")

    if not verify_webhook_hmac(body, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    topic = request.headers.get("X-Shopify-Topic", "")
    shop_domain = request.headers.get("X-Shopify-Shop-Domain")

    try:
        if topic == "customers/data_request":
            # We don't store customer-level data on the Shopify side of
            # this integration — nothing to return, but the request is
            # logged for audit purposes.
            logger.info("[compliance] data request for shop=%s", shop_domain)

        elif topic == "customers/redact":
            logger.info("[compliance] customer redact for shop=%s", shop_domain)

        elif topic == "shop/redact":
            store = session.exec(
                select(ShopifyStore).where(
                    ShopifyStore.shopify_shop_domain == shop_domain
                )
            ).first()
            if store:
                shops = session.exec(
                    select(Shop).where(Shop.shopify_store_id == store.id)
                ).all()
                for shop in shops:
                    shop.shopify_store_id = None
                    shop.shopify_location_id_public = None
                    shop.use_shopify_public = False
                    session.add(shop)

                session.delete(store)
                session.commit()
            logger.info("[compliance] shop redact completed for shop=%s", shop_domain)
    except Exception:
        logger.exception(
            "Failed to process compliance webhook topic=%s shop=%s", topic, shop_domain
        )

    return JSONResponse({"received": True})


# ── 9. GET /shopify/locations ────────────────────────────────────────────
@router.get("/locations")
def get_locations_by_company(
    company_id: int, current_user: CurrentUser, session: SessionDep
):
    """
    Fetches Shopify locations from every store linked to this company,
    for the location-picker on the shop page. A company can have more
    than one Shopify store connected — locations from all of them are
    merged into one list, tagged with which store each came from so
    staff can tell apart same-named locations across different stores.
    """
    stores = session.exec(
        select(ShopifyStore).where(ShopifyStore.company_id == company_id)
    ).all()
    if not stores:
        raise HTTPException(
            status_code=404, detail="Company is not connected to a Shopify store"
        )

    all_locations = []
    for store in stores:
        try:
            access_token = ensure_valid_shopify_token(store, session)
            data = shopify_graphql(
                store.shopify_shop_domain, access_token, LOCATIONS_QUERY, {"first": 50}
            )
        except (HTTPException, ShopifyAPIError) as exc:
            status = getattr(exc, "status_code", 500)
            detail = getattr(exc, "detail", str(exc))
            logger.error(
                "[shopify locations error] store=%s status=%s detail=%s",
                store.id,
                status,
                detail,
            )
            continue  # one store failing shouldn't hide the others' locations

        for edge in data.get("locations", {}).get("edges", []):
            all_locations.append(
                {
                    "location_id": str(edge["node"]["legacyResourceId"]),
                    "name": edge["node"].get("name"),
                    "active": edge["node"].get("isActive"),
                    "store_domain": store.shopify_shop_domain,
                }
            )

    return all_locations


# ── 10. POST /shopify/shop/connect ───────────────────────────────────────────
@router.post("/shop/connect")
def connect_shop_shopify(
    shop_id: int,
    location_id: str,
    current_user: CurrentUser,
    session: SessionDep,
):
    """
    Links a Shop to a specific Shopify location, once its parent company's
    store is connected. A company can have more than one Shopify store,
    so this searches every linked store for the one that actually owns
    the chosen location_id, rather than assuming a single store — the
    same reasoning as get_locations_by_company above.

    Writes only to the *_public columns — never the legacy
    shopify_location_id / use_shopify fields, which belong to the
    existing (unrelated) flow.
    """
    shop = session.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    stores = session.exec(
        select(ShopifyStore).where(ShopifyStore.company_id == shop.company_id)
    ).all()
    if not stores:
        raise HTTPException(
            status_code=400,
            detail="Shop's company is not connected to a Shopify store",
        )

    clash = session.exec(
        select(Shop).where(
            Shop.shopify_location_id_public == location_id,
            Shop.company_id == shop.company_id,
            Shop.id != shop_id,
        )
    ).first()
    if clash:
        raise HTTPException(
            status_code=409,
            detail="Another shop is already connected to this Shopify location",
        )

    # Search each of the company's stores for the one that actually owns
    # this location — a company can have multiple stores, so we can't
    # assume it's always the first one.
    matched_store = None
    for candidate_store in stores:
        try:
            access_token = ensure_valid_shopify_token(candidate_store, session)
            data = shopify_graphql(
                candidate_store.shopify_shop_domain,
                access_token,
                LOCATIONS_QUERY,
                {"first": 50},
            )
        except (HTTPException, ShopifyAPIError) as exc:
            status = getattr(exc, "status_code", 500)
            detail = getattr(exc, "detail", str(exc))
            logger.error(
                "[shopify shop/connect error] store=%s status=%s detail=%s",
                candidate_store.id,
                status,
                detail,
            )
            continue  # this store is unusable — keep searching the others

        valid_ids = [
            str(edge["node"]["legacyResourceId"])
            for edge in data.get("locations", {}).get("edges", [])
        ]
        if location_id in valid_ids:
            matched_store = candidate_store
            break

    if not matched_store:
        raise HTTPException(
            status_code=400,
            detail="Location ID does not exist in any of this company's Shopify accounts",
        )

    shop.shopify_store_id = matched_store.id
    shop.shopify_location_id_public = location_id
    shop.use_shopify_public = True

    session.add(shop)
    session.commit()
    session.refresh(shop)

    return {
        "status": "connected",
        "shop_id": shop_id,
        "shopify_location_id_public": shop.shopify_location_id_public,
    }


# ── 11. DELETE /shopify/shop/disconnect ─────────────────────────────────────
@router.delete("/shop/disconnect")
def disconnect_shop_shopify(
    shop_id: int, current_user: CurrentUser, session: SessionDep
):
    """Clears a Shop's public-app Shopify location link. Does not touch
    the store-level connection or the legacy shopify_location_id/use_shopify
    fields."""
    shop = session.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop.shopify_store_id = None
    shop.shopify_location_id_public = None
    shop.use_shopify_public = False

    session.add(shop)
    session.commit()

    return {
        "status": "disconnected",
        "shop_id": shop.id,
        "shopify_store_id": shop.shopify_store_id,
        "shopify_location_id_public": shop.shopify_location_id_public,
    }
