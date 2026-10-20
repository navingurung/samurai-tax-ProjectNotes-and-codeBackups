from fastapi import APIRouter, HTTPException, Depends, Response, Cookie, Header, status
from ..utils.shopify_staff_links import save_link, delete_links, get_link
from ..models import AdminUser, Company, Shop, ShopifyStore
from ..dependencies import SessionDep
from sqlmodel import select, SQLModel
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import Annotated
from jose import jwt
from dotenv import load_dotenv
import os
from datetime import timedelta, datetime, timezone
from ..utils.encrypt import decrypt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS"))
SECURE = os.getenv("SECURE", "False").lower() == "true"
SAMESITE = os.getenv("SAMESITE")

router = APIRouter(prefix="/auth", tags=["auth"])

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _password_matches(password: str, stored_hash: str | None) -> bool:
    """A missing or malformed stored hash is a failed login, never a 500.

    passlib raises ValueError (or its UnknownHashError subclass) for a hash it
    can't parse. Anything else is a real problem and should surface.
    """
    if not stored_hash:
        return False
    try:
        return bcrypt_context.verify(password, stored_hash)
    except ValueError:
        return False


oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")


class Token(SQLModel):
    user_id: int
    name: str
    role: str


class CompanyToken(SQLModel):
    company_id: int
    name: str
    email: str


class ShopToken(SQLModel):
    shop_id: int
    name: str
    login_id: str


def get_shopify_embedded_identity(
    authorization: str | None, session: SessionDep
) -> tuple[ShopifyStore, int] | None:
    """Inside the Shopify admin (SAM-610): resolve the store and Shopify staff
    ID from `Authorization: Bearer <session token>`.

    Returns None when there is no Bearer header, so callers keep the existing
    cookie behavior. Raises 401 for a bad token and 403 for a store that is
    unknown, not linked to a company, or disconnected.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    # Imported here, not at the top: shopify.py imports from this module.
    from .shopify import verify_embedded_session_token

    shop_domain, shopify_user_id = verify_embedded_session_token(
        authorization.removeprefix("Bearer ").strip()
    )

    store = session.exec(
        select(ShopifyStore).where(ShopifyStore.shopify_shop_domain == shop_domain)
    ).first()
    if not store or store.company_id is None or store.disconnected_at is not None:
        raise HTTPException(status_code=403, detail="This Shopify store is not linked")

    return store, shopify_user_id


def get_shopify_link_identity(
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
) -> dict | None:
    """Inside the Shopify admin (SAM-611): identify the caller from the Bearer
    session token and the saved staff link, rechecked on every request.

    Returns None without a Bearer header, so cookie auth runs as before.
    Otherwise returns the same dict as the cookie dependencies, plus "type".
    """
    embedded = get_shopify_embedded_identity(authorization, session)
    if not embedded:
        return None
    store, shopify_user_id = embedded

    not_authenticated = HTTPException(status_code=401, detail="Not authenticated")
    link = get_link(store.id, shopify_user_id)
    if not link or link["company_id"] != store.company_id:
        raise not_authenticated

    if link["shop_id"] is None:
        company = session.get(Company, link["company_id"])
        if not company:
            raise not_authenticated
        return {
            "type": "company",
            "login_id": company.login_id,
            "company_id": company.id,
            "name": company.biz_name,
            "email": decrypt(company.manager_email),
            "logo_id": company.logo_id,
        }

    shop = session.get(Shop, link["shop_id"])
    if not shop or shop.shopify_store_id != store.id:
        raise not_authenticated
    return {
        "type": "shop",
        "login_id": shop.login_id,
        "shop_id": shop.id,
        "name": shop.shop_name,
    }


def authenticate_user(username: str, password: str, session: SessionDep):
    statement = select(AdminUser).where(AdminUser.login_id == username)
    db_user = session.exec(statement).one_or_none()
    if not db_user:
        return False
    if not _password_matches(password, db_user.login_password):
        return False
    return db_user


def create_access_token(
    login_id: str, user_id: str, name: str, role: str, expires_delta: timedelta
):
    encode = {"sub": login_id, "id": user_id, "name": name, "role": role}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user_from_cookie(
    aat: str = Cookie(None),
):
    if not aat:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt.decode(aat, SECRET_KEY, algorithms=[ALGORITHM])
        login_id: str = payload.get("sub")
        user_id: int = payload.get("id")
        name: str = payload.get("name")
        role: str = payload.get("role")
        # Reject a shop token replayed in the `aat` cookie (privilege escalation).
        if not login_id or not user_id or not name or not role or role == "shop":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return {
        "login_id": login_id,
        "user_id": user_id,
        "name": name,
        "role": role,
    }


def authenticate_company(username: str, password: str, session: SessionDep):
    statement = select(Company).where(Company.login_id == username)
    db_company = session.exec(statement).one_or_none()
    if not db_company:
        return False
    if not _password_matches(password, db_company.login_password):
        return False
    decrypted_company = Company(
        id=db_company.id,
        biz_name=db_company.biz_name,
        biz_name_kana=db_company.biz_name_kana,
        biz_place=db_company.biz_place,
        biz_place_kana=db_company.biz_place_kana,
        manager_name=db_company.manager_name,
        manager_name_kana=db_company.manager_name_kana,
        manager_email=decrypt(db_company.manager_email),
        manager_phone=decrypt(db_company.manager_phone),
        sender_id=db_company.sender_id,
        login_id=db_company.login_id,
        logo_id=db_company.logo_id,
    )
    return decrypted_company


def create_access_token_for_company(
    login_id: str,
    company_id: str,
    biz_name: str,
    manager_email: str,
    expires_delta: timedelta,
    logo_id: str | None = None,
):
    encode = {
        "sub": login_id,
        "id": company_id,
        "name": biz_name,
        "email": manager_email,
        "logo_id": logo_id,
    }
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_company_from_cookie(
    cat: str = Cookie(None),
    shopify: Annotated[dict | None, Depends(get_shopify_link_identity)] = None,
):
    # Inside Shopify (SAM-611): the Bearer token wins and cookies are ignored.
    if shopify:
        if shopify["type"] != "company":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )
        return {k: v for k, v in shopify.items() if k != "type"}
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt.decode(cat, SECRET_KEY, algorithms=[ALGORITHM])
        login_id: str = payload.get("sub")
        company_id: int = payload.get("id")
        name: str = payload.get("name")
        email: str = payload.get("email")
        logo_id: str | None = payload.get("logo_id")
        role: str | None = payload.get("role")
        # Company tokens never carry a `role`. Reject any token that does (shop
        # or admin) so a shop/admin token cannot be replayed in the `cat` cookie.
        if not login_id or not company_id or not name or role is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return {
        "login_id": login_id,
        "company_id": company_id,
        "name": name,
        "email": email,
        "logo_id": logo_id,
    }


def authenticate_shop(username: str, password: str, session: SessionDep):
    statement = select(Shop).where(Shop.login_id == username)
    db_shop = session.exec(statement).one_or_none()
    if not db_shop:
        return False
    if not _password_matches(password, db_shop.login_password):
        return False
    return db_shop


def create_access_token_for_shop(
    login_id: str,
    shop_id: int,
    shop_name: str,
    expires_delta: timedelta,
):
    encode = {
        "sub": login_id,
        "id": shop_id,
        "name": shop_name,
        "role": "shop",
    }
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_shop_from_cookie(
    sat: str = Cookie(None),
    shopify: Annotated[dict | None, Depends(get_shopify_link_identity)] = None,
):
    # Inside Shopify (SAM-611): the Bearer token wins and cookies are ignored.
    if shopify:
        if shopify["type"] != "shop":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )
        return {k: v for k, v in shopify.items() if k != "type"}
    if not sat:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt.decode(sat, SECRET_KEY, algorithms=[ALGORITHM])
        login_id: str = payload.get("sub")
        shop_id: int | None = payload.get("id")
        name: str = payload.get("name")
        role: str | None = payload.get("role")
        # Require a dedicated shop role so a company/admin token cannot be
        # replayed in the `sat` cookie (token-type confusion). Use `is None`
        # for the id so a legitimate integer PK is never rejected as falsy.
        if not login_id or shop_id is None or not name or role != "shop":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return {
        "login_id": login_id,
        "shop_id": shop_id,
        "name": name,
    }


async def get_current_company_or_shop_from_cookie(
    cat: str = Cookie(None),
    sat: str = Cookie(None),
    shopify: Annotated[dict | None, Depends(get_shopify_link_identity)] = None,
):
    # Inside Shopify (SAM-611): the Bearer token wins and cookies are ignored.
    if shopify:
        return shopify
    # Company-wins, fail-closed: a present-but-invalid `cat` raises 401 and does
    # NOT fall through to `sat`. Existing prod users hold `cat`, so this keeps
    # their behavior unchanged regardless of any stray `sat`. Token-type
    # confusion is handled inside each dependency (the company decoder rejects
    # any role-bearing token; the shop decoder requires role == "shop").
    if cat:
        company = await get_current_company_from_cookie(cat=cat)
        return {"type": "company", **company}
    if sat:
        shop = await get_current_shop_from_cookie(sat=sat)
        return {"type": "shop", **shop}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_dashboard_or_admin_from_cookie(
    aat: str = Cookie(None),
    cat: str = Cookie(None),
    sat: str = Cookie(None),
    shopify: Annotated[dict | None, Depends(get_shopify_link_identity)] = None,
):
    # Inside Shopify (SAM-611): the Bearer token wins and cookies are ignored.
    if shopify:
        return shopify
    # Resolve each cookie independently and prefer any VALID dashboard token
    # (company first, then shop) so a dashboard caller is scoped to its own token.
    # A stale/invalid dashboard cookie is skipped — it can't block or escalate a
    # valid one. Admin is the fallback only when no dashboard token is valid, and a
    # valid dashboard token always wins over `aat`.
    if cat:
        try:
            return {"type": "company", **await get_current_company_from_cookie(cat=cat)}
        except HTTPException:
            pass
    if sat:
        try:
            return {"type": "shop", **await get_current_shop_from_cookie(sat=sat)}
        except HTTPException:
            pass
    if aat:
        return {"type": "admin", **await get_current_user_from_cookie(aat=aat)}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_current_user_or_company_or_shop_from_cookie(
    aat: str = Cookie(None),
    cat: str = Cookie(None),
    sat: str = Cookie(None),
    shopify: Annotated[dict | None, Depends(get_shopify_link_identity)] = None,
):
    # Inside Shopify (SAM-611): the Bearer token wins and cookies are ignored.
    if shopify:
        return shopify
    if aat:
        user = await get_current_user_from_cookie(aat=aat)
        return {"type": "admin", **user}
    if cat:
        company = await get_current_company_from_cookie(cat=cat)
        return {"type": "company", **company}
    if sat:
        shop = await get_current_shop_from_cookie(sat=sat)
        return {"type": "shop", **shop}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


@router.post("/token", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
):
    user = authenticate_user(form_data.username, form_data.password, session)
    if not user:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials"
        )

    token = create_access_token(
        user.login_id,
        user.id,
        user.name,
        user.role,
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    )

    response.set_cookie(
        key="aat",
        value=token,
        httponly=True,
        secure=SECURE,
        samesite=SAMESITE,
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60,
    )
    # Only one active session per browser: clear any stale dashboard cookies so a
    # leftover shop/company session can't shadow this fresh admin login on the
    # dashboard-first auth dependency.
    response.delete_cookie(key="cat", path="/")
    response.delete_cookie(key="sat", path="/")

    return {"user_id": user.id, "name": user.name, "role": user.role}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="aat",
        path="/",
    )
    return {"message": "Logged out successfully"}


@router.get("/whoami")
async def whoami(current_user: dict = Depends(get_current_user_from_cookie)):
    return {
        "user_id": current_user["user_id"],
        "name": current_user["name"],
        "role": current_user["role"],
    }


@router.post("/company-token", response_model=CompanyToken)
async def company_login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
):
    embedded = get_shopify_embedded_identity(authorization, session)

    company = authenticate_company(form_data.username, form_data.password, session)
    if not company:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials"
        )

    if embedded:
        # Inside Shopify: save a staff link instead of setting cookies (SAM-610).
        store, shopify_user_id = embedded
        if store.company_id != company.id:
            raise HTTPException(
                status_code=403,
                detail="This account can't be used in this Shopify store",
            )
        save_link(store.id, shopify_user_id, company_id=company.id, shop_id=None)
        return {
            "company_id": company.id,
            "name": company.biz_name,
            "email": company.manager_email,
        }

    token = create_access_token_for_company(
        company.login_id,
        company.id,
        company.biz_name,
        company.manager_email,
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        logo_id=company.logo_id,
    )

    response.set_cookie(
        key="cat",
        value=token,
        httponly=True,
        secure=SECURE,
        samesite=SAMESITE,
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60,
    )
    # Prevent a browser from holding both a company and a shop session, and clear
    # any stale admin session so a leftover `aat` can't shadow this login.
    response.delete_cookie(key="sat", path="/")
    response.delete_cookie(key="aat", path="/")

    return {
        "company_id": company.id,
        "name": company.biz_name,
        "email": company.manager_email,
    }


@router.post("/company-logout")
async def company_logout(
    response: Response,
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
):
    embedded = get_shopify_embedded_identity(authorization, session)
    if embedded:
        # Inside Shopify: delete this staff member's link (SAM-610).
        store, shopify_user_id = embedded
        delete_links(shopify_store_id=store.id, shopify_user_id=shopify_user_id)
        return {"message": "Logged out successfully"}

    response.delete_cookie(
        key="cat",
        path="/",
    )
    return {"message": "Logged out successfully"}


@router.get("/company-whoami")
async def company_whoami(
    current_user: dict = Depends(get_current_company_from_cookie),
):
    return {
        "login_id": current_user["login_id"],
        "company_id": current_user["company_id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "logo_id": current_user["logo_id"],
    }


@router.post("/shop-token", response_model=ShopToken)
async def shop_login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
):
    embedded = get_shopify_embedded_identity(authorization, session)

    shop = authenticate_shop(form_data.username, form_data.password, session)
    if not shop:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials"
        )

    if embedded:
        # Inside Shopify: save a staff link instead of setting cookies (SAM-610).
        # The shop must be connected to a location of this Shopify store.
        store, shopify_user_id = embedded
        if shop.shopify_store_id != store.id:
            raise HTTPException(
                status_code=403,
                detail="This account can't be used in this Shopify store",
            )
        save_link(
            store.id, shopify_user_id, company_id=shop.company_id, shop_id=shop.id
        )
        return {
            "shop_id": shop.id,
            "name": shop.shop_name,
            "login_id": shop.login_id,
        }

    token = create_access_token_for_shop(
        shop.login_id,
        shop.id,
        shop.shop_name,
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    )

    response.set_cookie(
        key="sat",
        value=token,
        httponly=True,
        secure=SECURE,
        samesite=SAMESITE,
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60,
    )
    # Prevent a browser from holding both a company and a shop session, and clear
    # any stale admin session so a leftover `aat` can't shadow this login.
    response.delete_cookie(key="cat", path="/")
    response.delete_cookie(key="aat", path="/")

    return {
        "shop_id": shop.id,
        "name": shop.shop_name,
        "login_id": shop.login_id,
    }


@router.post("/shop-logout")
async def shop_logout(
    response: Response,
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
):
    embedded = get_shopify_embedded_identity(authorization, session)
    if embedded:
        # Inside Shopify: delete this staff member's link (SAM-610).
        store, shopify_user_id = embedded
        delete_links(shopify_store_id=store.id, shopify_user_id=shopify_user_id)
        return {"message": "Logged out successfully"}

    response.delete_cookie(
        key="sat",
        path="/",
    )
    return {"message": "Logged out successfully"}


@router.get("/shop-whoami")
async def shop_whoami(
    current_shop: dict = Depends(get_current_shop_from_cookie),
):
    return {
        "login_id": current_shop["login_id"],
        "shop_id": current_shop["shop_id"],
        "name": current_shop["name"],
    }
