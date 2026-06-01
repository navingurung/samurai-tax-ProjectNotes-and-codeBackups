# How to Integrate Smaregi POS Data on Our Web App
 
## Prerequisites
 
- Account on [developers.smaregi.dev](https://developers.smaregi.dev)
- ngrok installed (needed for Step 4)
---
 
## Step 1 — Login to Smaregi Developers
 
Go to [https://developers.smaregi.dev/](https://developers.smaregi.dev/) and log in with your account.
 
---
 
## Step 2 — Navigate to Private App
 
On the left sidebar:
<img width="1877" height="960" alt="Screenshot 2026-06-01 at 15 39 09" src="https://github.com/user-attachments/assets/66a14c8c-3a8d-4ae5-9035-caf351ef8b2c" />

```
Application → Private App
```
 
---
 
## Step 3 — Register New App
 
Click **「New registration」** and fill in Basic Information:
 
| Field | Value |
|-------|-------|
| **App division** | `WEB App` ← must select this |
| **App name** | Your app name (e.g. `Samurai Tax(testing)`) |
| **Icon** | Upload any image (512×512px, max 1MB) |
 
Click **「Register」** to save.

<img width="1778" height="858" alt="Screenshot 2026-06-01 at 15 42 11" src="https://github.com/user-attachments/assets/bccf2326-a051-45ad-aa6a-1a11bb95db42" />

---

## Step 4 — Environment Settings ⏭ SKIP FOR NOW

> ⚠️ Come back to this step **after Step 9**.
>
> Smaregi does **not accept** `localhost` or private IP addresses in this form.
> You need a real public URL from ngrok before filling this in.

Fields to fill later:
<img width="1692" height="831" alt="Screenshot 2026-06-01 at 15 19 57" src="https://github.com/user-attachments/assets/027e6dae-caeb-49cf-8951-8501d6ab9163" />

| Field | Value |
|-------|-------|
| **App URL** | ngrok URL (e.g. `https://abc123.ngrok-free.app`) |
| **URL of user contract notification destination** | ngrok URL + `/contract` |
| **Webhook destination endpoint** | Fill in Step 11 |
| **Redirect URI** | Leave as is (`urn:ietf:wg:oauth:2.0:oob`) |

Also save these credentials from this page:

| Credential | Note |
|------------|------|
| **Client ID** | Copy and save |
| **Client Secret** | Click 👁 to reveal — shown only once, copy immediately |
| **Contract ID** | Top-left of dashboard (`sb_xxxx`) |

---

## Step 5 — Set Scopes ✅

Go to the **「Scope」** tab and enable:

- `pos.transactions:read`
- `pos.products:read`
- `pos.stores:read`

<img width="1903" height="857" alt="Screenshot 2026-06-01 at 16 01 44" src="https://github.com/user-attachments/assets/97cfbceb-1713-464d-b204-d2bf7aec6846" />

---


## Step 6 — Write FastAPI Code
 
Write the backend code locally.
 
```
backend/
├── main.py
├── config.py
├── auth/
│   └── smaregi_auth.py       # Token fetch + cache + auto-refresh
├── routes/
│   ├── webhook.py             # POST /webhook/transaction
│   └── transactions.py        # GET /transactions, GET /transactions/{id}
└── services/
    └── smaregi_client.py      # Smaregi API HTTP client
```
 
---
 
## Step 7 — Run FastAPI Locally
 
```bash
uvicorn main:app --reload --port 8000
```
 
Confirm it's running at `http://localhost:8000`.
 
---
 
## Step 8 — Install and Run ngrok
 
ngrok gives your local server a public URL so Smaregi can reach it.
 
```
Your Laptop (localhost:8000)
        ↕  tunnel
ngrok (public URL)
        ↕  internet
Smaregi Cloud (webhook push)
```
 
**Install:**
```bash
# macOS
brew install ngrok
 
# Or download from https://ngrok.com
```
 
**Run:**
```bash
ngrok http 8000
```
 
> ⚠️ ngrok is only needed for **local development**.
> In production, your deployed server already has a public URL — no ngrok needed.
 
---
 
## Step 9 — Get ngrok Public URL
 
After running ngrok you will see:
 
```
Forwarding  https://abc123.ngrok-free.app → localhost:8000
```
 
Copy `https://abc123.ngrok-free.app` — this is your temporary public URL.
 
---
 
## Step 10 — Go Back and Fill Step 4 Environment Settings
 
Now go back to Smaregi Developers → your app → **「Environment settings」** tab and fill in:
 
| Field | Value |
|-------|-------|
| **App URL** | `https://abc123.ngrok-free.app` |
| **URL of user contract notification destination** | `https://abc123.ngrok-free.app/contract` |
| **Redirect URI** | Leave as is |
 
Save the page.
 
---
 
## Step 11 — Set Webhook URL
 
Still in **「Environment settings」**, fill in:
 
| Field | Value |
|-------|-------|
| **Webhook destination endpoint** | `https://abc123.ngrok-free.app/webhook/transaction` |
 
Save the page.
 
---
 
## Step 12 — Test Everything
 
1. Simulate a transaction in Smaregi sandbox POS
2. Check FastAPI logs — webhook should fire
3. Check your frontend — transaction should appear in real-time
---
 
## Environment Variables
 
```env
# Smaregi Sandbox
SMAREGI_CONTRACT_ID=sb_xxxx
SMAREGI_CLIENT_ID=your_client_id
SMAREGI_CLIENT_SECRET=your_client_secret
 
# Base URLs (swap for production)
SMAREGI_AUTH_BASE_URL=https://id.smaregi.dev
SMAREGI_API_BASE_URL=https://api.smaregi.dev
```
 
> For production, change to:
> - `https://id.smaregi.jp`
> - `https://api.smaregi.jp`
 
---
 
## Step 6 — Write FastAPI Code
 
### Project Structure
 
```
smaregi-backend/
├── .env
├── config.py
├── main.py
├── requirements.txt
├── auth/
│   ├── __init__.py
│   └── smaregi_auth.py
├── routes/
│   ├── __init__.py
│   ├── transactions.py
│   └── webhook.py
└── services/
    ├── __init__.py
    └── smaregi_client.py
```
 
### Create Folder Structure
 
```bash
mkdir -p auth routes services
touch auth/__init__.py routes/__init__.py services/__init__.py
touch .env
```
 
### requirements.txt
 
```txt
fastapi
uvicorn
httpx
python-dotenv
```
 
### .env
 
```env
SMAREGI_CONTRACT_ID=sb_xxxx
SMAREGI_CLIENT_ID=your_client_id
SMAREGI_CLIENT_SECRET=your_client_secret
 
SMAREGI_AUTH_BASE_URL=https://id.smaregi.dev
SMAREGI_API_BASE_URL=https://api.smaregi.dev
 
APP_PORT=8000
```
 
### config.py
 
```python
from dotenv import load_dotenv
import os
 
load_dotenv()
 
SMAREGI_CONTRACT_ID = os.getenv("SMAREGI_CONTRACT_ID")
SMAREGI_CLIENT_ID = os.getenv("SMAREGI_CLIENT_ID")
SMAREGI_CLIENT_SECRET = os.getenv("SMAREGI_CLIENT_SECRET")
SMAREGI_AUTH_BASE_URL = os.getenv("SMAREGI_AUTH_BASE_URL", "https://id.smaregi.dev")
SMAREGI_API_BASE_URL = os.getenv("SMAREGI_API_BASE_URL", "https://api.smaregi.dev")
```
 
### auth/smaregi_auth.py
 
Token fetch + in-memory cache + auto-refresh.
 
```python
import httpx
import base64
import time
from config import (
    SMAREGI_CONTRACT_ID,
    SMAREGI_CLIENT_ID,
    SMAREGI_CLIENT_SECRET,
    SMAREGI_AUTH_BASE_URL,
)
 
_token_cache: dict = {
    "access_token": None,
    "expires_at": 0,
}
 
SCOPES = "pos.transactions:read pos.products:read pos.stores:read"
 
 
def _basic_auth_header() -> str:
    credentials = f"{SMAREGI_CLIENT_ID}:{SMAREGI_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"
 
 
async def get_access_token() -> str:
    now = time.time()
 
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]
 
    url = f"{SMAREGI_AUTH_BASE_URL}/app/{SMAREGI_CONTRACT_ID}/token"
 
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": _basic_auth_header(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "client_credentials",
                "scope": SCOPES,
            },
        )
 
    response.raise_for_status()
    data = response.json()
 
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = now + data["expires_in"]
 
    return _token_cache["access_token"]
```
 
### services/smaregi_client.py
 
```python
import httpx
from auth.smaregi_auth import get_access_token
from config import SMAREGI_API_BASE_URL, SMAREGI_CONTRACT_ID
 
 
async def _get_headers() -> dict:
    token = await get_access_token()
    return {"Authorization": f"Bearer {token}"}
 
 
async def fetch_transaction(transaction_id: str) -> dict:
    url = f"{SMAREGI_API_BASE_URL}/{SMAREGI_CONTRACT_ID}/pos/transactions/{transaction_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=await _get_headers())
    response.raise_for_status()
    return response.json()
 
 
async def fetch_transaction_details(transaction_id: str) -> list:
    url = f"{SMAREGI_API_BASE_URL}/{SMAREGI_CONTRACT_ID}/pos/transactions/{transaction_id}/details"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=await _get_headers())
    response.raise_for_status()
    return response.json()
 
 
async def fetch_store(store_id: str) -> dict:
    url = f"{SMAREGI_API_BASE_URL}/{SMAREGI_CONTRACT_ID}/pos/stores/{store_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=await _get_headers())
    response.raise_for_status()
    return response.json()
```
 
### routes/webhook.py
 
> ⚠️ Smaregi sends `transactionHeadIds` (array) — not `transactionId`.
 
```python
from fastapi import APIRouter, Request
from services.smaregi_client import fetch_transaction, fetch_transaction_details
 
router = APIRouter()
 
transactions_store: dict = {}
 
 
@router.post("/webhook/transaction")
async def receive_transaction_webhook(request: Request):
    payload = await request.json()
 
    transaction_head_ids = payload.get("transactionHeadIds", [])
    if not transaction_head_ids:
        return {"status": "ignored", "reason": "no transactionHeadIds in payload"}
 
    transaction_id = str(transaction_head_ids[0])
 
    transaction = await fetch_transaction(transaction_id)
    details = await fetch_transaction_details(transaction_id)
 
    transactions_store[transaction_id] = {
        "transaction": transaction,
        "details": details,
    }
 
    print(f"[Webhook] Transaction received: {transaction_id}")
 
    return {"status": "ok", "transaction_id": transaction_id}
```
 
### routes/transactions.py
 
```python
from fastapi import APIRouter, HTTPException
from routes.webhook import transactions_store
from services.smaregi_client import fetch_transaction, fetch_transaction_details
 
router = APIRouter()
 
 
@router.get("/transactions")
async def list_transactions():
    return {
        "count": len(transactions_store),
        "transactions": list(transactions_store.values()),
    }
 
 
@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str):
    if transaction_id in transactions_store:
        return transactions_store[transaction_id]
 
    try:
        transaction = await fetch_transaction(transaction_id)
        details = await fetch_transaction_details(transaction_id)
        return {"transaction": transaction, "details": details}
    except Exception:
        raise HTTPException(status_code=404, detail="Transaction not found")
```
 
### main.py
 
```python
from fastapi import FastAPI
from routes.webhook import router as webhook_router
from routes.transactions import router as transactions_router
 
app = FastAPI(title="Smaregi Tax-Free Integration")
 
app.include_router(webhook_router)
app.include_router(transactions_router)
 
 
@app.get("/")
async def root():
    return {"status": "running"}
 
 
@app.get("/contract")
async def contract_notification():
    return {"status": "ok"}
```
 
---
 
## Step 7 — Run FastAPI Locally
 
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
 
Confirm running at `http://localhost:8000/docs`
 
---
 
## Step 8 — Install and Run ngrok
 
```bash
# Install
brew install ngrok
 
# Add authtoken (get from https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken YOUR_TOKEN_HERE
 
# Run (in a new terminal tab, keep FastAPI running)
ngrok http 8000
```
 
---
 
## Step 9 — Get ngrok Public URL
 
After running ngrok you will see:
 
```
Forwarding  https://abc123.ngrok-free.app → localhost:8000
```
 
Copy that URL.
 
> ⚠️ Free plan generates a new random URL every time you restart ngrok.
> For production, use a real deployed server URL instead.
 
---
 
## Step 10 — Fill Environment Settings in Smaregi
 
Go to your app → **「Environment settings」** tab:
 
| Field | Value |
|-------|-------|
| **App URL** | `https://abc123.ngrok-free.app` |
| **URL of user contract notification destination** | `https://abc123.ngrok-free.app/contract` |
| **Redirect URI** | Leave as is |
 
Save the page.
 
---
 
## Step 11 — Set Webhook URL and Enable Events
 
### Set webhook URL
 
Still in **「Environment settings」**:
 
| Field | Value |
|-------|-------|
| **Webhook destination endpoint** | `https://abc123.ngrok-free.app/webhook/transaction` |
 
### Enable webhook events
 
Go to **「Webhook」** tab:
 
- Toggle **「Using webhook」** → **Enabled**
- Scroll down and enable **取引 (transactions)** event
- Click **Save**
---
 
## Step 12 — Test Everything ✅
 
1. Open Smaregi POS app on iPad
2. Log in with sandbox account (`sb_xxxx`)
3. Complete a test transaction
4. Check FastAPI terminal — you should see:
```
[Webhook] Transaction received: 3
```
 
5. Open browser and go to `http://localhost:8000/transactions`
6. You should see full transaction data including products, amounts, tax
---
 
## What the Webhook Payload Looks Like
 
Smaregi sends this when a transaction is created:
 
```json
{
    "contractId": "sb_skt114t4",
    "event": "pos:transactions",
    "action": "created",
    "transactionHeadIds": ["3"]
}
```
 
## What Our API Returns
 
```json
{
  "count": 1,
  "transactions": [
    {
      "transaction": {
        "transactionHeadId": "3",
        "transactionDateTime": "2026-06-01T17:07:30+09:00",
        "total": "1000",
        "taxInclude": "90",
        "storeId": "1",
        ...
      },
      "details": [
        {
          "productName": "cocacola",
          "price": "1000",
          "quantity": "1",
          "categoryName": "ドリンク",
          "taxRate": "10.000",
          ...
        }
      ]
    }
  ]
}
```
 
