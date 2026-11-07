# 7anime — Current Checkpoint

## Current Phase

Phase 5 — Mobile-First Hero, Profile & Permanent Anime Logo Fix

## Current Task

Execute production-quality mobile-first fixes for the Hero carousel, User Profile page, navigation safe-area clearances, and permanent local backend anime logo delivery architecture across 10 curated anime, while resolving desktop floating capsule navbar content overlap on scroll.

## Status

COMPLETE

## Completed Work

- **Task 1 — Permanent Local Backend Anime Logo Architecture:**
  - Curated, downloaded, and verified all 10 official transparent PNG title logos directly in `backend/assets/hero-logos/` (committed to git, not stored in ephemeral runtime directories or user uploads):
    1. *One Piece* (`anilistId: 21`, `tmdbId: 37854`, `one-piece.png`, 500x173, aspect ratio 2.89)
    2. *Naruto Shippuden* (`anilistId: 1735`, `tmdbId: 31910`, `naruto-shippuden.png`, 500x262, aspect ratio 1.908)
    3. *Bleach* (`anilistId: 269`, `tmdbId: 30984`, `bleach.png`, 500x179, aspect ratio 2.793)
    4. *Black Clover* (`anilistId: 97940`, `tmdbId: 73223`, `black-clover.png`, 500x87, aspect ratio 5.747)
    5. *Demon Slayer* (`anilistId: 101922`, `tmdbId: 85937`, `demon-slayer.png`, 499x473, aspect ratio 1.055)
    6. *Jujutsu Kaisen* (`anilistId: 113415`, `tmdbId: 95479`, `jujutsu-kaisen.png`, 500x112, aspect ratio 4.464)
    7. *Attack on Titan* (`anilistId: 16498`, `tmdbId: 1429`, `attack-on-titan.png`, 500x145, aspect ratio 3.448)
    8. *Solo Leveling* (`anilistId: 151807`, `tmdbId: 127532`, `solo-leveling.png`, 500x138, aspect ratio 3.623)
    9. *Dragon Ball Z* (`anilistId: 813`, `tmdbId: 12971`, `dragon-ball-z.png`, 500x131, aspect ratio 3.817)
    10. *Death Note* (`anilistId: 1535`, `tmdbId: 13916`, `death-note.png`, 499x123, aspect ratio 4.057)
  - Configured Express static asset middleware in `backend/src/server.ts` for `/assets` and `/api/assets` with immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`), proper MIME types (`image/png`, `image/svg+xml`, `image/webp`), and cross-origin access (`Access-Control-Allow-Origin: *`).
  - Added Tier-0 instant local mapping in `backend/src/services/tmdb.ts` (`CURATED_HERO_MAP`), eliminating external network requests, rate limiting, and DNS failures for curated anime.
  - Mirrored assets in `public/assets/hero-logos/` and configured Vite proxy in `vite.config.ts` for comprehensive dev and offline resilience.

- **Task 2 — Logo Rendering Pipeline Audit & URL Normalization:**
  - Audited `AnimeLogo.tsx`, `animeLogo.css`, `CinematicCarousel.tsx`, and `anilist.ts`.
  - Added `normalizeLogoUrl()` in `src/services/anilist.ts` to automatically prefix relative paths (`/assets/...`) with active backend origin (`BACKEND_URL`).
  - Updated `AnimeLogo.tsx` with defensive normalization, priority eager loading for slide 0, and responsive max-height scaling.

- **Task 3 — Mobile-First Hero Section Overhaul (`rail.css` & `animeLogo.css`):**
  - Designed distinct mobile compositions across 4 mobile/tablet breakpoints:
    - **Tablet (601px–1024px):** 1-column layout, poster hidden, `min-height: clamp(34rem, 72vh, 46rem)`.
    - **Large Mobile (431px–600px):** `min-height: clamp(34rem, 82vh, 42rem)`, deep vertical vignette gradient, non-wrapping specs row, 2-line clamped synopsis, 44px touch buttons.
    - **Standard Mobile (375px–430px):** `min-height: clamp(32rem, 84vh, 39rem)`, compact metadata, properly sized logo (`clamp(2.8rem, 11vw, 4.2rem)`), full touch carousel.
    - **Compact Mobile (320px–374px):** `min-height: clamp(30rem, 88vh, 36rem)`, compact buttons, zero horizontal overflow.
  - Background artwork readability: Added deep multi-stop vertical gradient (`linear-gradient(180deg, rgba(8,10,15,0.35) 0%, rgba(8,10,15,0.55) 25%, rgba(8,10,15,0.88) 60%, rgba(8,10,15,0.98) 100%)`) ensuring foreground text and buttons pop without losing cinematic aesthetics.
  - Horizontal thumbnail carousel: Native touch momentum scrolling (`-webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory`), active indicator border/glow (`#55d8ff`), and right-side safe padding (`1.75rem`) so the 10th thumbnail is never cut off.

- **Task 4 — Desktop Navbar Overlap Fix on Scroll (`Navigation.tsx` & `navigation.css`):**
  - Implemented directional scroll tracking: scrolling DOWN smoothly slides the floating capsule navbar out of view (`transform: translate(-50%, -170%); opacity: 0; pointer-events: none;`).
  - Scrolling UP or approaching top of viewport (`clientY < 60` or `scrollY <= 40`) immediately slides the navbar back into position.
  - Fully eliminates navbar overlap over the Monthly Watch Activity Calendar and Streak Milestones when viewing profile data.

- **Task 5 — Mobile Bottom Navigation & Safe-Area Clearance:**
  - Added `padding-bottom: calc(7.5rem + env(safe-area-inset-bottom, 0px))` across `.home`, `.home-body`, `.profile-space`, `.anime-detail`, and view containers.
  - Updated `.mobile-nav` with safe-area fallback: `bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))`.
  - Added `max-height: calc(100dvh - 2rem)` and `overflow-y: auto` on avatar and profile edit modals to guarantee they never overflow small mobile screens.

- **Task 6 — Global Horizontal Overflow Guard (`global.css`):**
  - Added `overflow-x: hidden; max-width: 100vw;` to `html` and `body` to guarantee 0px horizontal scroll jumps while preserving individual rail scrolling.

- **Task 7 — Comprehensive Verification Across 5 Viewports (`scripts/verify-phase5.mjs`):**
  - Verified all 10 anime logos return HTTP 200 PNG with immutable cache headers.
  - Verified Hero and Profile across all 5 resolutions with 0px horizontal overflow:
    - Small mobile: `320 x 720` (PASS, 0px overflow, 10 thumbs, official logo)
    - Standard mobile: `375 x 812` (PASS, 0px overflow, 10 thumbs, official logo)
    - Large mobile: `430 x 932` (PASS, 0px overflow, 10 thumbs, official logo)
    - Tablet: `768 x 1024` (PASS, 0px overflow, 10 thumbs, official logo)
    - Desktop: `1440 x 900` (PASS, 0px overflow, 10 thumbs, official logo, navbar auto-hide PASS: `navTop: -87.26px`)
  - Saved verification screenshots in `docs/screenshots/phase5/`:
    - `hero-small-mobile.png`, `hero-standard-mobile.png`, `hero-large-mobile.png`, `hero-tablet.png`, `hero-desktop.png`
    - `profile-small-mobile.png`, `profile-standard-mobile.png`, `profile-large-mobile.png`, `profile-tablet.png`, `profile-desktop.png`, `profile-desktop-scrolled-calendar.png`

## Files Created

- `backend/assets/hero-logos/one-piece.png`
- `backend/assets/hero-logos/naruto-shippuden.png`
- `backend/assets/hero-logos/bleach.png`
- `backend/assets/hero-logos/black-clover.png`
- `backend/assets/hero-logos/demon-slayer.png`
- `backend/assets/hero-logos/jujutsu-kaisen.png`
- `backend/assets/hero-logos/attack-on-titan.png`
- `backend/assets/hero-logos/solo-leveling.png`
- `backend/assets/hero-logos/dragon-ball-z.png`
- `backend/assets/hero-logos/death-note.png`
- `public/assets/hero-logos/*` (mirrored client assets)
- `scripts/verify-phase5.mjs`
- `docs/screenshots/phase5/hero-*.png` (5 viewport screenshots)
- `docs/screenshots/phase5/profile-*.png` (6 viewport screenshots)

## Files Modified

- `backend/src/server.ts`
- `backend/src/services/tmdb.ts`
- `src/components/anime/AnimeLogo.tsx`
- `src/components/anime/animeLogo.css`
- `src/components/carousel/rail.css`
- `src/components/navigation/Navigation.tsx`
- `src/components/navigation/navigation.css`
- `src/components/profile/avatar-modal.css`
- `src/components/profile/profile.css`
- `src/pages/preview.css`
- `src/services/anilist.ts`
- `src/styles/global.css`
- `vite.config.ts`
- `docs/CHECKPOINT.md`
- `docs/DEVELOPMENT_STATUS.md`

## Architecture Decisions

- Permanent storage architecture: Logos are tracked directly in Git under `backend/assets/hero-logos/` (and `public/assets/hero-logos/`), bypassing external network flakiness, ISP DNS blocks, TMDB rate limits, and ephemeral server storage restrictions.
- Triple redundancy delivery: Express serves assets with 1-year immutable caching at `/assets` and `/api/assets`, Vite proxies `/assets/hero-logos` in dev, and client static fallback serves them if backend is offline.
- Directional scroll navigation: Floating capsule navbar auto-hides on downward scroll and reveals on scroll up or mouse approach, ensuring user has 100% unobstructed view of all reading content (calendars, milestones, lists).

## Tests / Checks

- Frontend TypeScript (`npx tsc -b`): PASS (0 errors)
- Backend TypeScript (`npx tsc -p backend/tsconfig.json`): PASS (0 errors)
- Production Build (`npm run build`): PASS (`✓ built in 12.13s`)
- 10 Logo HTTP 200 Asset Verification: PASS (10/10 loaded, MIME `image/png`, Cache `public, max-age=31536000, immutable`)
- 5-Viewport Headless Browser Verification (320px, 375px, 430px, 768px, 1440px): PASS (all 11 screenshots captured, 0px horizontal overflow)
- Desktop Navbar Auto-Hide Test: PASS (nav hides on scroll down to `navTop: -87.26px`, leaving calendar completely visible)

## Verification Results

- Verified that One Piece renders the official TMDB logo image (`one-piece.png`) on all mobile viewports without text fallback.
- Verified that all 10 curated anime render verified logo PNGs.
- Verified that mobile Hero background gradient protects typography and controls from artwork distraction.
- Verified that thumbnail carousel is horizontally scrollable with touch momentum, clear active glow border, and zero end-clipping.
- Verified that bottom mobile navigation floats above content without obscuring Continue Watching or buttons.
- Verified that scrolling down on Profile page hides the desktop navbar so Monthly Watch Activity and Streak Milestones headers are 100% clear.
- Verified that no horizontal overflow exists on any viewport width from 320px to 1440px.

## Known Issues

- None.

## Incomplete Work

- None for Phase 5.

## Follow-Up

- None.

## Git State

Branch:
main

Working tree:
MODIFIED

Latest relevant commit:
docs: complete phase 4.3 monthly watch activity calendar visual redesign

## Recovery Instructions

If work resumes in a new session:

1. Read this file.
2. Read `docs/DEVELOPMENT_STATUS.md`.
3. Inspect `git status`.
4. Inspect current implementation.
5. Continue from the exact next task.
6. Do not redo completed work.

## Exact Next Task

Phase 4 — Streaming Provider Restructuring: Restructure the streaming provider architecture to replace `0vidads.top` with MegaPlay AniList, MegaPlay MAL, and NXsha.
