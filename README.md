# baeck-google-tester

Minimal Next.js app for exercising a Google OAuth login/logout loop. The whole
UI is one page: a "Sign in with Google" button, and once authenticated, a
"Success!" message plus a "Log out" button. Intended as a template for other
projects — the auth wiring here (`auth.ts`, the API route, `.env.local`) is
what you copy forward.

Stack: Next.js (App Router) + [Auth.js / NextAuth v5](https://authjs.dev) +
Google provider. Auth.js redirects to Google's hosted OAuth consent screen
and back — no client-side Google SDK involved, so there's a real
server-verified session on every load.

## 1. Google Cloud OAuth client

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
on your OAuth 2.0 Client ID (Web application type), add these to
**Authorized redirect URIs**:

- `http://localhost:3000/api/auth/callback/google` (local dev)
- `https://<your-deployed-domain>/api/auth/callback/google` (if/when deployed)

Grab the Client ID and Client Secret for the next step.

## 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

- `AUTH_GOOGLE_ID` — Client ID from step 1
- `AUTH_GOOGLE_SECRET` — Client Secret from step 1
- `AUTH_SECRET` — already generated for you in `.env.local`; regenerate with
  `openssl rand -base64 33` if you want a fresh one

## 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Sign in with
Google**, complete the consent screen, and you should land back on the page
showing **Success!** and a **Log out** button. Logging out and signing back
in repeatedly is the point — it's the smoke test for the whole flow.

## Files that matter

- `auth.ts` — Auth.js config (Google provider)
- `app/api/auth/[...nextauth]/route.ts` — auth API route handlers
- `app/page.tsx` — the single page, gated on `auth()`
