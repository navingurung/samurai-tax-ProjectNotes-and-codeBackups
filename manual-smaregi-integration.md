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
 
---
 
## Step 4 — Environment Settings
 
After registering, go to the **「Environment settings」** tab.
 
### 4.1 Fill in the required fields
 
| Field | Value |
|-------|-------|
| **App URL** | Your ngrok URL (e.g. `https://abc123.ngrok-free.app`) |
| **URL of user contract notification destination** | Your ngrok URL + `/contract` (e.g. `https://abc123.ngrok-free.app/contract`) |
| **Webhook destination endpoint** | Leave blank for now — fill after FastAPI is running |
| **Redirect URI** | Leave as is (`urn:ietf:wg:oauth:2.0:oob`) |
 
> ⚠️ **Important:** Fields 1 and 2 do not accept `localhost` or private IP addresses.
> You must have ngrok running before filling these in.
> See **ngrok Setup** section below.
 
### 4.2 Save your credentials
 
| Credential | Where to Find | Action |
|------------|--------------|--------|
| **Client ID** | Environment settings page | Copy and save |
| **Client Secret** | Environment settings page, click 👁 to reveal | Copy immediately — shown only once |
| **Contract ID** | Top-left of dashboard (format: `sb_xxxx`) | Copy and save |
 
> ⚠️ **Client Secret is shown only once.** If you miss it, you must reissue it — which invalidates the old one.
 
---
 
## ngrok Setup
 
ngrok gives your local server a public URL so Smaregi can reach it.
 
```
Your Laptop (localhost:8000)
        ↕  tunnel
ngrok (public URL)
        ↕  internet
Smaregi Cloud (webhook push)
```
 
### Install ngrok
 
```bash
# macOS
brew install ngrok
 
# Or download from https://ngrok.com
```
 
### Run ngrok
 
```bash
ngrok http 8000
```
 
You will see output like:
 
```
Forwarding  https://abc123.ngrok-free.app → localhost:8000
```
 
Use `https://abc123.ngrok-free.app` as your base URL in Smaregi Environment Settings.
 
> ⚠️ ngrok is only needed for **local development**.
> In production, your deployed server already has a public URL — no ngrok needed.
 
---
 
## Next Steps
 
- [ ] Step 5 — Set Scopes
- [ ] Step 6 — Start FastAPI backend
- [ ] Step 7 — Set Webhook URL after ngrok is running
