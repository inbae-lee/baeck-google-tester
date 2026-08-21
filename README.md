# baeck-google-tester

A page for exercising a Google OAuth login/logout loop, with the ID token
actually verified server-side and each sign-in logged to a Google Sheet.
Sign in with Google, see a "Success!" message, log out, repeat. Intended as
a template for other projects — the pieces below are what you copy forward.

Stack:

- **Frontend**: plain HTML/CSS/JS, no build step, using
  [Google Identity Services](https://developers.google.com/identity/gsi/web)
  (GIS) for sign-in.
- **Backend**: a single Vercel serverless function ([api/verify.js](api/verify.js))
  that verifies the ID token locally against Google's public keys (via
  [`google-auth-library`](https://github.com/googleapis/google-auth-library-nodejs),
  the officially correct way — no external calls needed per request) and
  appends a row to a Google Sheet for each verified sign-in.
- Both are deployed together on Vercel, so frontend and backend share an
  origin — no CORS to think about.

Why a backend at all: the frontend alone can decode a JWT, but decoding
isn't verifying — anyone can hand the page a forged token with an email
field of their choosing. `/api/verify` is what actually confirms the token
came from Google, wasn't tampered with, and was issued for this app.

Why Sheets for logging: it's free, requires no database to stand up or
manage, and anyone you share the Sheet with can see sign-in activity
without needing any tooling.

## 1. Google Cloud OAuth client

You likely already have this from earlier. In
[Google Cloud Console](https://console.cloud.google.com/apis/credentials),
on your OAuth 2.0 Client ID (Web application type), make sure
**Authorized JavaScript origins** includes your Vercel domain once you have
one (e.g. `https://baeck-google-tester.vercel.app`) and `http://localhost:3000`
for local dev.

## 2. Google Sheets logging setup

In the same Google Cloud project:

1. **Enable the API**: APIs & Services > Library > search "Google Sheets
   API" > Enable.
2. **Create a service account**: IAM & Admin > Service Accounts > Create
   Service Account. No project-level role needed — access is granted by
   sharing the Sheet directly (step 4).
3. **Create a key**: open the service account > Keys > Add Key > Create new
   key > JSON. This downloads a JSON file — you need two fields from it:
   `client_email` and `private_key`.
4. **Create and share a Sheet**: make a new Google Sheet, add header row
   `Timestamp | Email | Name` to a tab named `Sheet1`, then Share it with
   the service account's `client_email` as **Editor**. Copy the Sheet ID
   from its URL (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`).

## 3. Configure the frontend

Edit [config.js](config.js) — `GOOGLE_CLIENT_ID` is already filled in for
this deployment; swap it if you're reusing this as a template elsewhere.

## 4. Deploy on Vercel

```bash
npx vercel login
npx vercel link      # creates/links the Vercel project
npx vercel env add GOOGLE_CLIENT_ID
npx vercel env add GOOGLE_SHEET_ID
npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
npx vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   # paste the full key, including BEGIN/END lines
npx vercel deploy --prod
```

(Everything above also works by connecting the GitHub repo in the Vercel
dashboard instead — Import Project, add the same four env vars under
Settings > Environment Variables, deploy. Either way, auto-deploys on every
push to `main` once linked.)

## 5. Run it locally

```bash
npx vercel dev --listen 3000
```

Open [http://localhost:3000](http://localhost:3000) — `vercel dev` pulls
your env vars automatically once linked. Click **Sign in with Google**, and
you should see **Success!** plus your verified email, a new row in the
Sheet, then a **Log out** button. Logging out and signing back in
repeatedly is the point — it's the smoke test for the whole flow, backend
and logging included.

## Notes / limits

- Sheets logging is best-effort: if it fails, sign-in still succeeds for a
  genuinely valid token (see the try/catch in `api/verify.js`). A Sheets
  API outage shouldn't lock anyone out.
- The Sheets API has per-minute write quotas on the free tier — fine at
  personal-project volume, not meant for high-traffic logging.
- `google-auth-library`'s `verifyIdToken` checks the signature against
  Google's public keys locally (cached, refreshed periodically) — no
  network round-trip to Google per verification, unlike the `tokeninfo`
  endpoint approach.

## Files that matter

- `index.html`, `style.css`, `app.js`, `config.js` — the frontend
- `api/verify.js` — verifies the token and logs to Sheets
- `package.json` — the one dependency (`google-auth-library`)
