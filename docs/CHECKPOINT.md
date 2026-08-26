# 7anime — Current Checkpoint

## Current Phase

Google Gmail API OAuth 2.0 Integration Complete

## Current Task

Implement Gmail API OAuth 2.0 transport in `backend/src/utils/mailer.ts` and add one-time OAuth authorization flow endpoints (`/api/auth/google/url`, `/api/auth/google/callback`) in `backend/src/routes/auth.ts`. Allow obtaining an offline `GMAIL_REFRESH_TOKEN` for `bricodz07@gmail.com` without exposing secrets or breaking existing password-reset routes.

## Status

COMPLETE

## Completed Work

1. **Package Installation**:
   - Installed `googleapis` Node SDK (`npm i googleapis`).

2. **OAuth 2.0 Authorization Flow**:
   - Implemented `GET /api/auth/google/url` in `backend/src/routes/auth.ts` (scope `https://www.googleapis.com/auth/gmail.send`, `access_type: 'offline'`, `prompt: 'consent'`).
   - Implemented `GET /api/auth/google/callback` to handle code exchange and display a secure one-time authorization page for copying `GMAIL_REFRESH_TOKEN` into Render environment secrets.

3. **Gmail API OAuth Mailer Transport**:
   - Refactored `backend/src/utils/mailer.ts` to construct RFC 2822 Base64-URL safe MIME messages and dispatch them via `gmail.users.messages.send({ userId: 'me' })`.
   - Maintained fallback support for Resend API (`RESEND_API_KEY`) if `GMAIL_REFRESH_TOKEN` is missing during setup.

4. **Template & Attachment Preservation**:
   - Preserved exact 7anime dark glass HTML UI design, 6-digit OTP layout, and 10-minute expiry warning.
   - Logo is referenced exclusively via HTTPS URL (`https://7anime-tv.vercel.app/logo.png`) with **0 attachments**, **0 CID tags**, and **0 base64 payloads**.

5. **Automated Verification**:
   - `npm run lint`: PASS (0 errors)
   - `npm run build`: PASS (22.33s)
   - `npm run build:backend`: PASS (tsc clean)

## Files Modified

- `package.json` — Added `googleapis` dependency.
- `backend/src/utils/mailer.ts` — Added Gmail API OAuth 2.0 email transport.
- `backend/src/routes/auth.ts` — Added `/api/auth/google/url` and `/api/auth/google/callback` endpoints.
- `docs/CHECKPOINT.md` — Updated checkpoint documentation.
- `docs/DEVELOPMENT_STATUS.md` — Updated development status.

## Required Environment Variables

```env
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GOOGLE_REDIRECT_URI=https://sevenanime-vodw.onrender.com/api/auth/google/callback
GMAIL_REFRESH_TOKEN=<obtained_via_oauth_flow>
GMAIL_USER=bricodz07@gmail.com
```

## Verification Results

- Automated checks: `lint`, `build`, `build:backend` all PASS cleanly.

## Git State

Branch: main
Working tree: MODIFIED

## Exact Next Task

Deploy backend to Render, authorize via `/api/auth/google/url`, set `GMAIL_REFRESH_TOKEN` in Render Environment.
