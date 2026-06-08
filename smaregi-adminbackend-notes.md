# Smaregi Admin Backend — Implementation Notes

## Overview

This document explains what we did, why we did it, and how it works.
Written for the team meeting to explain the Smaregi integration on the admin backend.

---

## 1. Database Changes

### Why we changed the DB first
Before writing any code, we designed the schema to match the existing pattern.
Square fields already exist in `companies` — we followed the same pattern for Smaregi.

### `companies` table — 4 columns added

```sql
ALTER TABLE companies
ADD COLUMN smaregi_contract_id      character varying   DEFAULT NULL,
ADD COLUMN smaregi_access_token     text                DEFAULT NULL,
ADD COLUMN smaregi_token_expires_at timestamp           DEFAULT NULL,
ADD COLUMN smaregi_connected_at     timestamp           DEFAULT NULL;
```

| Column | Purpose |
|---|---|
| `smaregi_contract_id` | The contract ID provided by the client (their Smaregi account ID) |
| `smaregi_access_token` | Access token fetched from Smaregi — valid for 1 hour |
| `smaregi_token_expires_at` | When the token expires — used to know when to refresh |
| `smaregi_connected_at` | Timestamp of when the company connected to Smaregi |

**Why NOT encrypted like Square?**
Square tokens are long-lived and sensitive — they need encryption.
Smaregi tokens expire in 1 hour and can be re-fetched anytime using our credentials — encryption is less critical here. We followed simplicity for now.

### `shops` table — 2 columns added

```sql
ALTER TABLE shops
ADD COLUMN smaregi_store_id   character varying   DEFAULT NULL,
ADD COLUMN use_smaregi        boolean             DEFAULT FALSE;
```

| Column | Purpose |
|---|---|
| `smaregi_store_id` | Smaregi's store ID for this shop — used to filter transactions per store |
| `use_smaregi` | ON/OFF toggle — whether this shop is using Smaregi |

**Why store_id on shops and contract_id on companies?**
One company has one contract_id (company level).
One company has many shops — each shop has its own store_id (shop level).
This matches Smaregi's actual structure.

---

## 2. `models.py` Changes

We added Smaregi fields to the `Company` and `Shop` SQLModel classes
so the backend can read and write these columns.

### Company model — added after `square_oauth_state`:

```python
smaregi_contract_id: Optional[str] = Field(default=None, nullable=True)
smaregi_access_token: Optional[str] = Field(default=None, nullable=True)
smaregi_token_expires_at: Optional[datetime] = Field(default=None, nullable=True)
smaregi_connected_at: Optional[datetime] = Field(default=None, nullable=True)
```

### Shop model — added after `use_square`:

```python
smaregi_store_id: Optional[str] = Field(default=None, nullable=True)
use_smaregi: bool = Field(default=False)
```

---

## 3. Created `routers/smaregi.py`

### Why a separate file?
We follow the same pattern as `square.py` — each integration has its own router file.
Clean, modular, easy to maintain.

### Why NOT like Square?
Square uses OAuth — the company logs in themselves and authorizes via a redirect URL.
Smaregi is a Private App — OAuth is not available for our use case.
Instead, we use `client_credentials` grant type:

```
Our Client ID + Our Client Secret + Client's Contract ID
        ↓
POST to Smaregi token endpoint
        ↓
Get access token (valid 1 hour)
```

This means **we (admin) do the connection on behalf of the company**, not the company themselves.

### Token URL per environment

| Environment | Token URL |
|---|---|
| Development/Sandbox | `https://id.smaregi.dev/app/{contract_id}/token` |
| Production | `https://id.smaregi.jp/app/{contract_id}/token` |

Set in `.env` — never hardcoded in the code.

---

## 4. The 4 Endpoints

### Company endpoints

**Connect:**
```
POST /smaregi/connect?company_id=X
Body: { "contract_id": "sb_skt114t4" }
```
- Admin is on the company edit page (knows company_id)
- Admin enters the contract_id provided by the client
- Backend fetches token from Smaregi to verify the contract_id is valid
- Saves contract_id + token + timestamps to companies table

**Disconnect:**
```
DELETE /smaregi/disconnect?company_id=X
```
- Clears all 4 Smaregi columns for that company
- Returns the contract_id that was disconnected for confirmation

### Shop endpoints

**Connect:**
```
POST /smaregi/shop/connect?shop_id=X
Body: { "store_id": "1" }
```
- Admin is on the shop edit page (knows shop_id)
- Admin enters the store_id from Smaregi
- Backend verifies the parent company is already connected to Smaregi
- Saves store_id and sets use_smaregi = true

**Disconnect:**
```
DELETE /smaregi/shop/disconnect?shop_id=X
```
- Clears smaregi_store_id and sets use_smaregi = false

---

## 5. Registered in `main.py`

```python
from .routers import smaregi
app.include_router(smaregi.router)
```

Same pattern as all other routers (square, company, shop, etc.)

---

## 6. `.env` Variables Required

```
SMAREGI_CLIENT_ID=your_client_id
SMAREGI_CLIENT_SECRET=your_client_secret
SMAREGI_TOKEN_URL=https://id.smaregi.dev/app/{contract_id}/token
SMAREGI_API_BASE_URL=https://api.smaregi.dev
```

---

## 7. What You Can See in the DB Now

**companies table:**
```
smaregi_contract_id      = "sb_skt114t4"
smaregi_access_token     = "eyJ0eXAiOiJKV1Q..."  (JWT token)
smaregi_token_expires_at = 2026-06-08 13:32:02   (1 hour after connect)
smaregi_connected_at     = 2026-06-08 12:32:02
```

**shops table:**
```
smaregi_store_id = "555"
use_smaregi      = true
```

---
