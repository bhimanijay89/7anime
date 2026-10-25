# 7anime — Deployment Architecture & Operations Guide

This guide details the single-source-of-truth deployment configuration for 7anime across both primary hosting targets: **Vercel** (`https://7anime-tv.vercel.app`) and **InfinityFree** (`https://7anime.ct.ws`), connecting to the production backend on **Render** (`https://sevenanime-vodw.onrender.com`).

---

## Architecture Overview

```text
                        ┌──────────────────────────────┐
                        │       7ANIME_CODEX           │
                        │   (Single React + TS Repo)   │
                        └──────────────┬───────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
      ┌───────────────────────┐                   ┌────────────────────────┐
      │   Vercel Deployment   │                   │  InfinityFree Package  │
      │  (Automated Git CI)   │                   │ (Static Build Package) │
      │  buildCommand:        │                   │ build:infinityfree     │
      │  tsc -b && vite build │                   │ -> deployment/         │
      │  outputDir: dist      │                   │    infinityfree/       │
      └──────────┬────────────┘                   └───────────┬────────────┘
                 │                                            │
                 │ https://7anime-tv.vercel.app               │ https://7anime.ct.ws
                 │                                            │
                 └─────────────────────┬──────────────────────┘
                                       │
                                       ▼ (HTTPS REST / JSON / Cookies)
                        ┌──────────────────────────────┐
                        │     Render Backend API       │
                        │ https://sevenanime-vodw...   │
                        │ CORS: vercel.app, ct.ws      │
                        └──────────────────────────────┘
```

---

## 1. Vercel Deployment Guide

### Domain & Status
- **Primary Domain**: `https://7anime-tv.vercel.app`
- **Deployment Mode**: Automatic via Git repository connection

### Settings & Build Configuration
Vercel is pre-configured via repository [vercel.json](file:///E:/7ANIME_CODEX/vercel.json):
- **Framework Preset**: `Vite`
- **Build Command**: `tsc -b && vite build` (or `npm run build` with root Prisma hook)
- **Output Directory**: `dist`
- **Install Command**: `npm install` (triggers `postinstall: prisma generate`)

### Vercel Routing & Headers
- Handled automatically via [vercel.json](file:///E:/7ANIME_CODEX/vercel.json):
  - **SPA Rewrite**: `/((?!assets/|logo\.png|favicon\.png).*)` -> `/index.html`
  - **Security Headers**: HSTS (`Strict-Transport-Security`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict CSP allowing `https://sevenanime-vodw.onrender.com` and video provider embeds.

### Environment Variables on Vercel Dashboard
Set these in **Vercel Project Settings > Environment Variables**:
- `VITE_API_URL`: `https://sevenanime-vodw.onrender.com` (Note: defaults safely to this URL in code if omitted)
- `NODE_ENV`: `production`

---

## 2. InfinityFree Deployment Guide

### Domain & Status
- **Target Domain**: `https://7anime.ct.ws`
- **Hosting Mode**: Static Apache Web Server (`htdocs/`)

### Automated Packaging Command
To generate a clean, validated upload package from your latest code, run:

```bash
npm run build:infinityfree
```

If you have already built `dist/` and only want to re-package the deployment folder:
```bash
npm run package:infinityfree
```

### Generated Package Location
- **Output Folder**: `deployment/infinityfree/`

The generated directory structure:
```text
deployment/infinityfree/
├── .htaccess                 <-- Dedicated Apache SPA routing & MIME rules
├── index.html                <-- SPA root entrypoint
├── favicon.png               <-- Site favicon
├── logo.png                  <-- Brand logo
└── assets/
    ├── index-[hash].js       <-- Bundled JavaScript application
    ├── index-[hash].css      <-- Bundled stylesheets
    └── favicon-[hash].png    <-- Optimized bundled favicon
```

### How to Upload to InfinityFree

1. Open your FTP client (**FileZilla**, **WinSCP**) or log in to the InfinityFree Control Panel and open the **Monsta File Manager**.
2. Connect using your InfinityFree FTP credentials:
   - **FTP Host**: Found in your InfinityFree client area (e.g., `ftpupload.net`)
   - **FTP Username**: Your InfinityFree hosting account username (e.g., `epiz_...`)
   - **FTP Password**: Your hosting account password
   - **Port**: `21`
3. In the remote server pane, open the **`htdocs/`** directory.
4. **Upload the CONTENTS** of `deployment/infinityfree/` directly into `htdocs/`.
   - **CRITICAL**: Do *not* upload the `infinityfree` folder itself as a subdirectory.
   - The files `index.html`, `.htaccess`, and the `assets/` folder must sit directly in the root of `htdocs/`.
   - If an existing default `index2.html` or placeholder file exists from InfinityFree, delete it.

### Required `.htaccess` Rules Included in the Package
The packager automatically embeds a production-grade `.htaccess` containing:
1. **SPA History Routing**:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} -f [OR]
     RewriteCond %{REQUEST_FILENAME} -d
     RewriteRule ^ - [L]
     RewriteRule ^ index.html [L]
   </IfModule>
   ErrorDocument 404 /index.html
   ```
2. **MIME Types**: Explicit mappings for `.js`, `.mjs`, `.css`, `.svg`, `.json`, `.webp`, `.woff2` to prevent script execution blocks.
3. **Cache Policy**: Long-term immutable caching (`max-age=31536000`) for hashed assets in `assets/`, and `no-cache` for `index.html` to guarantee instant deployment updates.
4. **Security**: `Options -Indexes` and standard browser protection headers.

### InfinityFree File Limit Notice
> [!NOTE]
> InfinityFree free tier limits individual uploads to 10 MB per file. The core web app (HTML, JS bundles ~330 KB, CSS ~113 KB, images) is lightweight and well below this limit. All large video assets such as `splash.mp4` have been completely removed from the project.

---

## 3. Render Backend Configuration & CORS

The backend runs on Render at:
`https://sevenanime-vodw.onrender.com`

### CORS Allowlist Verification
The backend server ([backend/src/server.ts](file:///E:/7ANIME_CODEX/backend/src/server.ts)) has an explicit multi-origin allowlist with `credentials: true`:

```typescript
const allowedOrigins = [
  'https://7anime-tv.vercel.app',
  'https://7anime.vercel.app',
  'https://7anime.ct.ws',
  'http://localhost:5173',
  'http://localhost:5174',
  ...envOrigins,
]
```

### Render Dashboard Settings
Ensure the following are set in the Render Web Service Environment:
- `ALLOWED_ORIGINS`: `https://7anime.ct.ws,https://7anime-tv.vercel.app` (optional override)
- `NODE_ENV`: `production`
- `DATABASE_URL`: Your Supabase connection string
- `DIRECT_URL`: Supabase direct connection string
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis token

### Authentication Compatibility Across Both Domains
Authentication uses a dual-layer strategy:
1. **Bearer Token Authentication**: The frontend stores the session token in `localStorage('7anime_token')` and sends `Authorization: Bearer <token>`. This is immune to cross-site cookie restrictions.
2. **SameSite=None Cookies**: The backend sets `Set-Cookie: sevenanime_session=...; SameSite=None; Secure; HttpOnly; Path=/`. This allows cross-origin credentials to work when accessing the Render API from both HTTPS domains (`7anime-tv.vercel.app` and `7anime.ct.ws`).

---

## 4. Keeping Deployments in Sync (Workflow)

To make updates without configuration drift:

```bash
# 1. Implement and test your frontend changes locally
npm run dev

# 2. Verify TypeScript, Linting, and Tests
npm run lint
npx tsc -b

# 3. Build & Package for InfinityFree
npm run build:infinityfree

# 4. Git Push triggers Vercel automatic CI/CD
git push origin main

# 5. Upload deployment/infinityfree/ contents to InfinityFree FTP htdocs/
```

Both environments consume the identical frontend build output, pointing to the exact same backend API, ensuring feature parity across both domains.
