# baeck-google-tester

Minimal page for exercising a Google OAuth login/logout loop, with the ID
token actually verified server-side. Sign in with Google, see a "Success!"
message, log out, repeat. Intended as a template for other projects — the
pieces below are what you copy forward.

Stack:

- **Frontend**: plain HTML/CSS/JS, no build step, using
  [Google Identity Services](https://developers.google.com/identity/gsi/web)
  (GIS) for sign-in. Hosted on GitHub Pages at
  [inbae-lee.github.io/baeck-google-tester](https://inbae-lee.github.io/baeck-google-tester).
- **Backend**: a [Google Apps Script](https://developers.google.com/apps-script)
  Web App ([backend/Code.js](backend/Code.js)) that verifies the ID token
  against Google's `tokeninfo` endpoint and checks it was issued for this
  app's client ID, before the frontend trusts it. Free, no server to manage.

Why a backend at all: the frontend alone can decode a JWT, but decoding
isn't verifying — anyone can hand the page a forged token with an email
field of their choosing. The backend call is what actually confirms the
token came from Google and wasn't tampered with.

## 1. Google Cloud OAuth client

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
on your OAuth 2.0 Client ID (Web application type), add to
**Authorized JavaScript origins**:

- `https://inbae-lee.github.io` (GitHub Pages)
- `http://localhost:3000` (local dev)

GIS uses the client ID directly from the browser — no redirect URI or client
secret needed.

## 2. Deploy the verify backend (Apps Script)

```bash
npx @google/clasp login       # opens a browser, sign in with your Google account
cd backend
npx @google/clasp create --title "baeck-google-tester-verify" --type webapp --rootDir .
npx @google/clasp push
```

Edit [backend/Code.js](backend/Code.js) first and set `ALLOWED_CLIENT_ID` to
the same OAuth client ID from step 1, then push again.

Then deploy it as a Web App (clasp can't do this part — one-time step in the
editor):

```bash
npx @google/clasp open
```

In the editor: **Deploy > New deployment > type: Web app** → Execute as:
**Me**, Who has access: **Anyone** → **Deploy**. Copy the Web App URL
(ends in `/exec`).

## 3. Configure the frontend

Edit [config.js](config.js):

- `GOOGLE_CLIENT_ID` — the OAuth client ID from step 1
- `BACKEND_VERIFY_URL` — the Apps Script Web App URL from step 2

## 4. Run it locally

```bash
npx serve .
```

Open the printed URL. Click **Sign in with Google** — the page sends the ID
token to the Apps Script backend, waits for it to confirm the token is
genuine, and only then shows **Success!** plus your verified email, then a
**Log out** button. Logging out and signing back in repeatedly is the point
— it's the smoke test for the whole flow, backend included.

## Deploying the frontend

Push to `main`. GitHub Pages serves the repo root directly — no build step.
Enabled once under **Settings > Pages > Source: Deploy from a branch
(main / root)**.

## Notes / limits

- The Apps Script endpoint has to allow "Anyone" access to be callable from
  a public page, so it's a public verify-only endpoint. It doesn't expose
  anything beyond confirming/denying a token — but it's also unauthenticated
  and rate-limited only by Apps Script's own quotas, not hardened against
  abuse.
- Verification calls Google's `tokeninfo` endpoint, which is the simplest
  reliable way to verify a JWT from Apps Script (no crypto libraries
  available). Fine at low volume; a high-traffic backend should verify
  locally against Google's public keys instead.
- Apps Script Web Apps never send an `Access-Control-Allow-Origin` header,
  so a plain cross-origin `fetch()` to `BACKEND_VERIFY_URL` is always
  blocked by CORS — there's no server config that fixes it. An `HtmlService`
  response plus `postMessage` was the first attempt, but Apps Script serves
  that inside a sandboxed frame whose `top` turned out to be isolated from
  the embedding page too (almost certainly a Cross-Origin-Opener-Policy
  boundary on Google's side) — verified live, not just theorized, and there
  was no way to reach back out through it.

  What actually works: `app.js` POSTs `{ credential, nonce }` via a hidden
  `<form>` to a hidden `<iframe>` (form submissions aren't subject to CORS,
  so the token itself never touches a URL), `doPost` verifies the token and
  caches the result under that nonce, and once the iframe finishes loading
  the frontend fetches the cached result via a JSONP `<script src>` tag
  keyed by that nonce — script tags aren't subject to CORS or sandboxing
  either. This is all Apps-Script-specific plumbing (see the comments in
  `backend/Code.js` and `app.js`), not something to carry over if you swap
  in a real backend later — a normal backend just sets CORS headers and
  none of this is needed.

## Files that matter

- `index.html`, `style.css`, `app.js`, `config.js` — the frontend
- `backend/Code.js`, `backend/appsscript.json` — the verify backend
