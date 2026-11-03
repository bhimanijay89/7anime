# 7anime — Current Checkpoint

## Current Phase

Phase 3.1 — Critical UI Corrections + Logo Persistence + Database Repair

## Current Task

Restoration of original capsule navbar, near-fullscreen Top 10 Hero with 7500ms autoplay, cinematic detail page cover sizing, PostgreSQL + Redis dual-tier logo caching persistence, and database table repair.

## Status

COMPLETE

## Completed Work

- **Task 1 — Restored Original Horizontal Capsule Navbar:**
  - Removed unintended left vertical sidebar and full-width topbar from `src/components/navigation/Navigation.tsx`.
  - Reinstated the original horizontal rounded capsule navbar (`.desktop-nav`) floating near the top center.
  - Contains: 7Anime logo, Home, Discover, Movies, Trending, Schedule, My List, Search icon trigger, Notifications icon, and Sign In / Profile chip.
  - Removed `.home { margin-left: 4.5rem; }` from `src/pages/preview.css`, ensuring full content width and proper horizontal centering.
  - Fully responsive with mobile navigation bar (`.mobile-nav`) on screens `< 1024px`.
- **Task 2 — Top 10 Hero Height Expansion & Autoplay Optimization:**
  - Enlarged Top 10 Hero desktop height in `src/components/carousel/rail.css` to near-fullscreen: `clamp(48rem, 82vh, 60rem)`, making it dramatically larger than the compact Upcoming Anime carousel (`28rem`).
  - Set carousel autoplay interval to `7500ms` in `src/components/carousel/CinematicCarousel.tsx`.
  - Configured autoplay timer to reset on manual thumbnail/arrow click and pause on hover or reduced-motion preferences.
- **Task 3 — Anime Detail Page Cover Container Sizing:**
  - Increased detail background cover container height in `src/components/anime/detail.css` to `clamp(34rem, 50vh, 44rem)`.
  - Provides a cinematic backdrop artwork presentation while preserving clear hierarchy and immediate visibility of episode listings.
- **Task 4 — Universal Anime Logo Rendering & Resiliency:**
  - Implemented authentic TMDB logo display across all 3 key locations:
    1. Anime Detail Page (`AnimeDetailHero.tsx`) at the exact title position.
    2. Top 10 Hero Carousel (`CinematicCarousel.tsx`) updating synchronously with active slide.
    3. Upcoming Anime Carousel (`UpcomingHero.tsx`).
  - Strict matching by AniList ID (`String(anime.id)`).
  - Enhanced `AnimeLogo.tsx` to render the styled text title continuously until the image finishes loading (`naturalWidth > 0`) or if network/CDN errors occur, completely preventing blank spaces or layout shifts during ISP latency or CDN blocking.
  - Optimized TMDB image base in backend to `https://image.tmdb.org/t/p/w500` (~40KB vs 1.5MB original) for instant logo loading.
- **Task 5 — Database Repair & Dual-Tier Logo Caching Persistence:**
  - Fixed `The table public.anime_tmdb_mappings does not exist in the current database` error.
  - Created and applied DDL migrations creating `anime_tmdb_mappings` and `anime_tmdb_logos` tables in Supabase PostgreSQL (`backend/prisma/schema.prisma`).
  - Re-generated Prisma client with full types for `prisma.animeTmdbLogo` and `prisma.animeTmdbMapping`.
  - Upgraded `backend/src/services/tmdb.ts` to implement 2-tier caching:
    - Tier 1: Upstash Redis cache (`anime:logo:{anilistId}`).
    - Tier 2: Supabase PostgreSQL cache (`anime_tmdb_logos`, 7-day TTL).
    - Tier 3: In-flight deduplicated TMDB API request with public DNS fallback.
    - On Redis miss + DB hit: automatically restores logo data back into Redis.
    - On TMDB fetch: atomically saves to both Redis (30-day TTL) and PostgreSQL (7-day TTL).
    - On negative result (404/no logos): caches negative entry in both Redis and DB for 7 days to eliminate redundant upstream calls.

## Files Created

- `backend/prisma/migrations/20261103_tmdb_mappings_and_logos/migration.sql`
- `docs/screenshots/capsule_navbar.png`
- `docs/screenshots/hero_top10.png`
- `docs/screenshots/hero_top10_onepiece.png`
- `docs/screenshots/upcoming_carousel.png`
- `docs/screenshots/anime_detail.png`

## Files Modified

- `backend/prisma/schema.prisma`
- `backend/src/services/tmdb.ts`
- `backend/src/routes/anime.ts`
- `backend/src/types.ts`
- `src/components/anime/AnimeLogo.tsx`
- `src/components/anime/AnimeDetailHero.tsx`
- `src/components/anime/detail.css`
- `src/components/carousel/CinematicCarousel.tsx`
- `src/components/carousel/rail.css`
- `src/components/navigation/Navigation.tsx`
- `src/components/navigation/navigation.css`
- `src/pages/preview.css`
- `src/services/anilist.ts`
- `docs/CHECKPOINT.md`
- `docs/DEVELOPMENT_STATUS.md`

## Files Deleted

- `scripts/patch-backend-url.mjs`
- `scripts/test-dom.mjs`
- `scripts/check-logos-db.mjs`
- `scripts/check-db-tables.mjs`
- `scripts/css-loader.mjs`
- `scripts/register-css.mjs`

## Architecture Decisions

- **Horizontal Capsule Navigation:** Retained original floating rounded capsule design (`.desktop-nav`) with standard brand, nav links, search trigger, notifications, and auth controls. Left vertical sidebar and rectangular topbar permanently removed.
- **Dual-Tier Cache Strategy:** Redis provides microsecond in-memory response speeds, while PostgreSQL provides durable long-term storage across Redis evictions or cold restarts.
- **Graceful Title Fallback:** `AnimeLogo.tsx` ensures text titles remain visible until the image confirms loaded state, eliminating empty title flickers.

## Tests / Checks

- TypeScript Frontend (`npx tsc -b`): PASS (0 errors)
- TypeScript Backend (`npx tsc -p backend/tsconfig.json`): PASS (0 errors)
- Build (`npm run build`): PASS (Vite production bundle built cleanly)
- Backend TMDB Logo Resolver (`test-tmdb-logo.ts`): PASS (20/20 assertions)
- Batch Logo API (`test-phase2-logo-api.ts`): PASS (31/31 assertions)
- Universal Logo Suite (`test-phase3-universal-logo.ts`): PASS (20/20 assertions)
- Browser/UI verification: PASS (Verified via Puppeteer screenshots)
  - `docs/screenshots/capsule_navbar.png`: Restored horizontal capsule navbar with all 10 navigation items.
  - `docs/screenshots/hero_top10_onepiece.png`: Authentic TMDB One Piece logo rendering in hero title position.
  - `docs/screenshots/hero_top10.png`: Near-fullscreen height `clamp(48rem, 82vh, 60rem)` and text fallback when logo is unavailable.
  - `docs/screenshots/upcoming_carousel.png`: Compact `28rem` Upcoming Anime carousel.
  - `docs/screenshots/anime_detail.png`: Cinematic `clamp(34rem, 50vh, 44rem)` detail cover height.

## Verification Results

1. **Capsule Navbar:** Confirmed horizontal rounded pill centered at top containing Logo, Home, Discover, Movies, Trending, Schedule, My List, Search, Notifications, and Sign In button.
2. **Top 10 Hero Height:** Near-fullscreen layout verified at 82vh/60rem.
3. **Autoplay Interval:** Verified at 7500ms with pause on interaction.
4. **Universal Logos:** One Piece TMDB logo verified in hero with transparent background and shadow.
5. **Database Tables:** Verified tables `public.anime_tmdb_mappings` and `public.anime_tmdb_logos` exist in Supabase PostgreSQL and store logo records with 7-day TTL.

## Known Issues

- None.

## Incomplete Work

- None for Phase 3.1.

## Follow-Up

- Phase 4 — Streaming Provider Restructuring.

## Git State

Branch:
main

Working tree:
MODIFIED

Latest relevant commit:
ui: complete Phase 3.1 critical UI corrections, logo persistence, and database repair

## Recovery Instructions

If work resumes in a new session:

1. Read this file.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Inspect current implementation.
5. Continue to Phase 4 (Streaming Provider Restructuring).
6. Do not redo completed work.

## Exact Next Task

Begin Phase 4 — Streaming Provider Restructuring (re-order streaming servers: Server 1 MegaPlay AniList, Server 2 MegaPlay MAL, Server 3 NXsha `?color=purple`, create Extensible Provider Adapter Registry, and purge `0vidads.top`).
