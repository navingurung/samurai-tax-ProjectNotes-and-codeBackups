# Shop Dashboard Login — Change Log
**Feature:** Shop-level access to the Dashboard  
**Date:** 2026-05-27  
**Author:** GURUNG NAVIN

---

## Background & Reason

Currently the Dashboard only supports company login (`/auth/company-token`).  
This feature adds shop-level login so individual shop staff can log in and view **only their own shop's data**.

The `shops` table already has `login_id` and `login_password` fields (used by the Shop POS App on samurai-tax-free-backend :8000).  
We reuse the same credentials — no new DB columns or tables needed.

**Role hierarchy:**
```
Company (admin) → sees all shops, has store filter
Shop (staff)    → sees only their own shop, no store filter
```

---

## Backend Changes — `routers/auth.py`

### Why
The existing auth router only handles `AdminUser` and `Company` login.  
We need to add shop authentication so shop staff can log into the Dashboard.

### What was added

#### 1. Import `Shop` model
```python
from ..models import AdminUser, Company, Shop  # Shop added
```
**Reason:** Need to query the `shops` table to authenticate shop credentials.

---

#### 2. New response model `ShopToken`
```python
class ShopToken(SQLModel):
    shop_id: int
    shop_name: str
    company_id: int
```
**Reason:** Defines what the `/auth/shop-token` endpoint returns to the frontend after successful shop login.

---

#### 3. New function `authenticate_shop`
```python
def authenticate_shop(username: str, password: str, session: SessionDep):
    statement = select(Shop).where(Shop.login_id == username)
    db_shop = session.exec(statement).one_or_none()
    if not db_shop:
        return False
    if not bcrypt_context.verify(password, db_shop.login_password):
        return False
    return db_shop
```
**Reason:** Queries the `shops` table and verifies the bcrypt hashed password. Same pattern as `authenticate_company`.

---

#### 4. New function `create_access_token_for_shop`
```python
def create_access_token_for_shop(
    login_id: str,
    shop_id: int,
    shop_name: str,
    company_id: int,
    expires_delta: timedelta,
):
    encode = {
        "sub": login_id,
        "id": shop_id,
        "name": shop_name,
        "company_id": company_id,
    }
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)
```
**Reason:** Creates a JWT token containing `shop_id`, `shop_name`, `company_id`. Sets `sat` (shop access token) cookie. Same pattern as `create_access_token_for_company`.

---

#### 5. New function `get_current_shop_from_cookie`
```python
async def get_current_shop_from_cookie(sat: str = Cookie(None)):
    ...
```
**Reason:** FastAPI dependency that reads and validates the `sat` cookie. Used to protect shop-only endpoints.

---

#### 6. New function `get_current_company_or_shop_from_cookie`
```python
async def get_current_company_or_shop_from_cookie(
    cat: str = Cookie(None),
    sat: str = Cookie(None),
):
    # tries cat (company) first, then sat (shop)
    # returns dict with "type": "company" or "type": "shop"
```
**Reason:** Some endpoints (like `/refundlist/transactions-by-date/`) need to be accessible by BOTH company and shop login. This dependency accepts either cookie and returns the caller's identity with a `type` field so the endpoint knows who is calling.  
**Important:** This must be defined AFTER `get_current_shop_from_cookie`.

---

#### 7. New endpoint `POST /auth/shop-token`
```python
@router.post("/shop-token", response_model=ShopToken)
async def shop_login_for_access_token(...):
```
**Reason:** Shop login endpoint. Accepts `username` + `password` (OAuth2 form), authenticates against `shops` table, sets `sat` httpOnly cookie, returns `shop_id`, `shop_name`, `company_id`.

---

#### 8. New endpoint `POST /auth/shop-logout`
```python
@router.post("/shop-logout")
async def shop_logout(response: Response):
    response.delete_cookie(key="sat", path="/")
```
**Reason:** Clears the `sat` cookie on logout.

---

## Backend Changes — `routers/refundlist.py`

### Why
The `/refundlist/transactions-by-date/` endpoint previously only accepted company login (`cat` cookie via `CurrentCompany`).  
Shop staff need to access this endpoint too, but must be restricted to their own shop's data.

### What was changed

#### 1. New import at top
```python
from .auth import get_current_company_or_shop_from_cookie
```
**Reason:** Import the combined auth dependency.

---

#### 2. New type alias
```python
CurrentCompanyOrShop = Annotated[dict, Depends(get_current_company_or_shop_from_cookie)]
```
**Reason:** Clean alias for use in endpoint signatures. Same pattern as existing `CurrentCompany` and `CurrentUser`.

---

#### 3. Updated `get_transactions_by_date` endpoint

**Before:**
```python
def get_transactions_by_date(
    current_company: CurrentCompany,  # only company login
    ...
):
    company_id = current_company["company_id"]
```

**After:**
```python
def get_transactions_by_date(
    current_auth: CurrentCompanyOrShop,  # accepts both company and shop login
    ...
):
    company_id = current_auth["company_id"]

    # if shop login → lock shop_id from token, ignore query param
    # this prevents shop users from accessing other shops' data
    if current_auth.get("type") == "shop":
        shop_id = current_auth["shop_id"]
```

**Reason:**  
- Changed `CurrentCompany` → `CurrentCompanyOrShop` so shop login (`sat` cookie) is accepted.  
- Added shop_id lock: when a shop logs in, their `shop_id` from the JWT token is used directly, ignoring the query param. This is a **security measure** — shop staff cannot change the `shop_id` in the URL to access other shops' data.  
- `company_id` is still used to fetch the `shop_map` for shop name lookups.  
- All other endpoints remain unchanged — they still use `CurrentCompany` or `CurrentUser`.

---

## Frontend Changes — `providers/LoginCompanyProvider.tsx`

### Why
The context previously only managed company login state.  
We need to store and expose shop login state (`loginShop`) and the current login type (`loginType`) so the Dashboard can behave differently for company vs shop users.

### What was added

#### 1. New state `loginShop`
```ts
const [loginShop, setLoginShop] = useState<any>(null);
```
**Reason:** Stores the shop login response (`shop_id`, `shop_name`, `company_id`) returned from `/auth/shop-token`.

#### 2. New derived value `loginType`
```ts
const loginType = loginCompany ? "company" : loginShop ? "shop" : null;
```
**Reason:** Tells the Dashboard which type of user is logged in. Company takes priority.

#### 3. `sessionStorage` — added `authShop` key
- On mount: checks `authShop` if `authCompany` is not found → restores shop session
- On state change: saves `loginShop` to `authShop`
- On logout: removes both `authCompany` and `authShop`

**Reason:** Persists shop login across page refresh within the same browser session. Uses `sessionStorage` (not `localStorage`) so it clears when the tab closes — same pattern as company login.

#### 4. `logout()` updated
```ts
sessionStorage.removeItem("authShop");
setLoginShop(null);
```
**Reason:** Ensures shop session is fully cleared on logout.

#### 5. Context value — 3 new exports
```ts
loginShop,
setLoginShop,
loginType,
```
**Reason:** Makes shop login data and login type available to all child components (Dashboard, login form, account page, etc.).

---

## Frontend Changes — `components/login-form.tsx`

### Why
The login form previously only called `/auth/company-token`.  
We need to let users choose between company and shop login on the same page.

### What was added

#### 1. New state `loginType` (local to form)
```ts
const [loginType, setLoginType] = useState<"company" | "shop">("company");
```
**Reason:** Controls which tab (会社/店舗) is selected. Defaults to company.

#### 2. Toggle UI (会社 / 店舗 buttons)
```tsx
<div className="flex rounded-lg border p-1 gap-1">
  <button onClick={() => setLoginType("company")}>会社</button>
  <button onClick={() => setLoginType("shop")}>店舗</button>
</div>
```
**Reason:** Allows user to switch between company and shop login on the same page without navigating to a different URL.

#### 3. Updated `onClickLogin` handler
```ts
if (loginType === "company") {
  // calls /auth/company-token → setLoginCompany → sessionStorage authCompany
} else {
  // calls /auth/shop-token → setLoginShop → sessionStorage authShop
}
```
**Reason:** Routes the login request to the correct endpoint based on the toggle selection.

#### 4. `setLoginShop` added to context destructure
```ts
const { setLoginCompany, setLoginShop, setIsLoggedIn } = context;
```
**Reason:** Needed to update shop login state in the provider after successful shop login.

---

## Frontend Changes — `components/filter.tsx`

### Why
The store filter dropdown (店舗選択) should be hidden when a shop user is logged in — they only see their own shop's data and have no need to switch stores.

### What was added

#### 1. New prop `hideStoreFilter`
```ts
interface FilterProps {
  ...
  hideStoreFilter?: boolean; // default false
}
```
**Reason:** Lets the parent (Dashboard page) control whether the store dropdown is shown.

#### 2. Conditional render of `Dropdown`
```tsx
{!hideStoreFilter && (
  <Dropdown ... />
)}
```
**Reason:** Hides the store filter for shop login. Company login is unaffected (`hideStoreFilter` defaults to `false`).

---

## Frontend Changes — `app/dashboard/page.tsx`

### Why
The Dashboard previously only initialized from `loginCompany`. For shop login, `loginCompany` is `null` so the dashboard would never load.

### What was changed

#### 1. Added `loginShop` and `loginType` from context
```ts
const { loginCompany, loginShop, loginType } = context;
```
**Reason:** Access shop login data and login type for conditional behavior.

#### 2. Updated initialization `useEffect`
```ts
useEffect(() => {
  if (!loginCompany && !loginShop) return; // wait for either login
  
  // lock shop_id for shop login
  if (loginType === "shop" && loginShop) {
    setSelectedStore({ storeIds: [String(loginShop.shop_id)] });
  }

  // only fetch store list for company login
  if (loginType === "company") getStores();
  
  setIsReady(true);
}, [loginCompany, loginShop]);
```
**Reason:**  
- Dashboard now initializes for both login types.  
- Shop login auto-sets `selectedStore` to their own `shop_id` → API will filter to their data only.  
- `getStores()` is skipped for shop login — they don't need the store list since the dropdown is hidden.

#### 3. Updated `Filter` JSX
```tsx
<Filter
  ...
  setSelectedStore={loginType === "shop" ? () => {} : setSelectedStore}
  hideStoreFilter={loginType === "shop"}
/>
```
**Reason:**  
- `hideStoreFilter={loginType === "shop"}` hides the store dropdown for shop users.  
- `setSelectedStore` is locked (no-op) for shop users — prevents the store selection from being changed client-side.

---

## Frontend Changes — `app/dashboard/account/page.tsx`

### Why
The account page fetches company details using `loginCompany.company_id`. For shop login, `loginCompany` is `null` so the page would spin forever.

### What was added

#### 1. `loginType` check
```ts
const { loginCompany, loginType } = context;

if (loginType === "shop") {
  return <message: このページは会社アカウントのみアクセス可能です />
}
```
**Reason:** Shop users don't have company account management access. Shows a clear message instead of an infinite spinner.

---

## Summary of Cookie Usage

| Cookie | Set by | Used by | Purpose |
|--------|--------|---------|---------|
| `cat` | `/auth/company-token` | `get_current_company_from_cookie` | Company session |
| `aat` | `/auth/token` | `get_current_user_from_cookie` | Admin/staff session |
| `sat` | `/auth/shop-token` | `get_current_shop_from_cookie`, `get_current_company_or_shop_from_cookie` | Shop session |

---

## Security Notes

- Shop users can only access their own data — `shop_id` is read from the JWT token server-side, not from the query param
- Shop users cannot access the account page
- Shop users cannot change the store filter
- All tokens use the same `SECRET_KEY` and `ALGORITHM` as existing tokens
- `sat` cookie is `httpOnly`, `secure` (in production), same `samesite` policy as other cookies
