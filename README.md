# baeck-google-tester

Minimal static page for exercising a Google OAuth login/logout loop. Sign in
with Google, see a "Success!" message, log out, repeat. Intended as a
template for other projects — `config.js` + `app.js` is the whole thing you
copy forward.

Stack: plain HTML/CSS/JS, no build step, using
[Google Identity Services](https://developers.google.com/identity/gsi/web)
(GIS) for client-side sign-in. No backend, no client secret — the client ID
is public by design. Hosted on GitHub Pages at
[inbae-lee.github.io/baeck-google-tester](https://inbae-lee.github.io/baeck-google-tester).

Note: the ID token returned by GIS is decoded in the browser for display
only — it is **not cryptographically verified**. That's fine for smoke-testing
that the OAuth flow itself works, but a real app needs a backend to verify
the token before trusting the identity it claims.

## 1. Google Cloud OAuth client

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
on your OAuth 2.0 Client ID (Web application type), add to
**Authorized JavaScript origins**:

- `https://inbae-lee.github.io` (GitHub Pages)
- `http://localhost:3000` (local dev)

GIS uses the client ID directly from the browser — no redirect URI or client
secret needed.

## 2. Configure

Edit [config.js](config.js) and set `GOOGLE_CLIENT_ID` to your OAuth client
ID.

## 3. Run it locally

```bash
npx serve .
```

Open the printed URL. Click **Sign in with Google**, and you should see
**Success!** plus your email, then a **Log out** button. Logging out and
signing back in repeatedly is the point — it's the smoke test for the whole
flow.

## Deploying

Push to `main`. GitHub Pages serves the repo root directly — no build step,
no GitHub Action needed. Enable it once under **Settings > Pages > Source:
Deploy from a branch (main / root)**.
