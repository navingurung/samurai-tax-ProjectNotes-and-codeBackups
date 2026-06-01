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

---
