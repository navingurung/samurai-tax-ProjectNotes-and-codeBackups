# Smaregi Integration — Tax-Free System

## Overview

This document describes how our Tax-Free application integrates with the Smaregi POS system to enable real-time tax refund processing for foreign tourists in Japan.

---

## System Architecture

```mermaid
graph TB
    subgraph Smaregi["Smaregi Cloud"]
        POS["POS Terminal\n(Store Staff)"]
        SAPI["Smaregi\nPlatform API"]
        WH["Webhook\nEvent Emitter"]
    end

    subgraph OurApp["Our Application"]
        FA["FastAPI Backend"]
        CACHE["In-Memory\nToken & Transaction Cache"]
        NX["Next.js Frontend\n(Store App)"]
    end

    subgraph External["External Services"]
        NTA["NTA API\n(Japan Tax Refund)"]
        PASS["Passport\nScanner"]
    end

    POS -->|"① Staff completes sale"| SAPI
    SAPI -->|"② Fires webhook\n(transaction event)"| WH
    WH -->|"③ POST /webhook/transaction"| FA
    FA -->|"④ Store transaction_id\nin memory"| CACHE
    FA -->|"⑤ GET /transactions/{id}\nfetch full details"| SAPI
    NX -->|"⑥ Staff sees new\ntransaction instantly"| FA
    PASS -->|"⑦ Scan passport"| NX
    NX -->|"⑧ Submit tax-free request"| FA
    FA -->|"⑨ Call NTA API"| NTA
    NTA -->|"⑩ Approval response"| FA
    FA -->|"⑪ Show result"| NX
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant App as FastAPI Backend
    participant Auth as Smaregi Auth Server\nid.smaregi.dev
    participant API as Smaregi API\napi.smaregi.dev

    App->>Auth: POST /app/{contract_id}/token\nBasic Auth (client_id:client_secret)\ngrant_type=client_credentials\nscope=pos.transactions:read ...

    Auth-->>App: { access_token, expires_in: 3600 }

    Note over App: Cache token in memory\nTrack expiry time

    App->>API: GET /pos/transactions/{id}\nAuthorization: Bearer {access_token}

    API-->>App: Transaction data (JSON)

    Note over App: Token expires after 1 hour\nAuto re-request new token\n(no refresh token in client_credentials)
```

---

## Real-Time Transaction Flow (Webhook)

```mermaid
sequenceDiagram
    participant Staff as Store Staff
    participant POS as Smaregi POS
    participant WH as Smaregi Webhook
    participant API as Our FastAPI
    participant FE as Next.js Frontend

    Staff->>POS: Complete sale transaction
    POS-->>WH: Transaction completed event
    WH->>API: POST /webhook/transaction\n{ transaction_id, store_id, ... }
    API-->>WH: 200 OK (acknowledge)

    Note over API: Store transaction_id in memory\nFetch full details from Smaregi API

    API->>WH: GET /pos/transactions/{id}
    WH-->>API: Full transaction + line items

    FE->>API: GET /transactions (polling or SSE)
    API-->>FE: Latest transaction data
    Note over FE: Staff sees transaction\nappear in real-time
```

---

## Tax-Free Processing Flow

```mermaid
sequenceDiagram
    participant Staff as Store Staff
    participant FE as Next.js Frontend
    participant API as Our FastAPI
    participant Scanner as Passport Scanner
    participant NTA as NTA API

    Staff->>FE: Select completed transaction
    FE->>API: GET /transactions/{id}
    API-->>FE: Transaction details\n(items, amounts, tax)

    Staff->>Scanner: Scan customer passport
    Scanner-->>FE: Passport data\n(name, nationality, passport_no)

    Staff->>FE: Confirm and submit tax-free request
    FE->>API: POST /tax-free\n{ transaction_id, passport_data }

    API->>NTA: Submit tax refund claim\n(transaction + passport data)
    NTA-->>API: Approval + refund amount

    API-->>FE: Tax-free approved ✅\nRefund: ¥XXX
    FE-->>Staff: Show approval + print receipt
```

---

## Project Structure

```
project/
├── backend/                        # FastAPI
│   ├── main.py                     # App entry point
│   ├── config.py                   # Env vars (contract_id, client_id, etc.)
│   ├── auth/
│   │   └── smaregi_auth.py         # Token fetch + cache + auto-refresh
│   ├── routes/
│   │   ├── webhook.py              # POST /webhook/transaction
│   │   └── transactions.py         # GET /transactions, GET /transactions/{id}
│   └── services/
│       └── smaregi_client.py       # Smaregi API HTTP client
│
├── frontend/                       # Next.js
│   └── ...
│
└── README.md                       # This file
```

---

## Environment Variables

```env
# Smaregi Sandbox
SMAREGI_CONTRACT_ID=sb_xxxx
SMAREGI_CLIENT_ID=your_client_id
SMAREGI_CLIENT_SECRET=your_client_secret

# Environments
SMAREGI_AUTH_BASE_URL=https://id.smaregi.dev
SMAREGI_API_BASE_URL=https://api.smaregi.dev

# NTA API (Japan Tax Refund)
NTA_API_URL=https://...
NTA_API_KEY=your_nta_api_key
```

---

## API Endpoints (Our Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/transaction` | Receive real-time transaction event from Smaregi |
| `GET` | `/transactions` | List all received transactions (in-memory) |
| `GET` | `/transactions/{id}` | Fetch full transaction details from Smaregi |
| `POST` | `/tax-free` | Submit tax-free request to NTA API |

---

## Smaregi App Setup Checklist

- [ ] Register account at [developers.smaregi.dev](https://developers.smaregi.dev)
- [ ] Create a **プライベートアプリ** (Private App) as **WEBアプリ** (Web App)
- [ ] Copy `client_id` and `client_secret` from Environment Settings
- [ ] Note sandbox `contract_id` (shown as `sb_xxxx` on dashboard)
- [ ] Enable scopes:
  - [ ] `pos.transactions:read`
  - [ ] `pos.products:read`
  - [ ] `pos.stores:read`
- [ ] Set webhook URL to your ngrok URL + `/webhook/transaction`
- [ ] Install [ngrok](https://ngrok.com) to expose local FastAPI for webhook testing

---

## Key Notes

- **App Access Token** expires in **3,600 seconds (1 hour)** — no refresh token, must re-request
- **Webhook** fires instantly when a POS transaction completes — this is what triggers the tax-free flow
- **Sandbox** (`api.smaregi.dev`) is safe for testing — no real store data affected
- **Production** uses `api.smaregi.jp` and `id.smaregi.jp` — swap via env vars only
