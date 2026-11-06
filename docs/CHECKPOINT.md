# 7anime — Current Checkpoint

## Current Phase

Phase 3.2.1 — Hero Layout, Ranking Removal & Permanent Anime Logo Fix

## Current Task

Elimination of black space above Hero, positioning floating capsule navbar over full-bleed Hero, complete removal of Top 10 ranking UI from Hero carousel, root-cause resolution of TMDB anime logo loading pipeline, and HTML-clean synopsis rendering.

## Status

COMPLETE

## Completed Work

- **Task 1 — Eliminated Black Space Above Hero & Floating Navbar Overlay:**
  - Repositioned original horizontal capsule navbar (`.desktop-nav`) with `position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 50; margin: 0;`.
  - Removed navbar from normal document flow, allowing the main Hero section to occupy the absolute top of the viewport (`top: 0`) edge-to-edge full-bleed (`width: 100%`).
  - Hero background artwork now seamlessly extends behind the floating liquid glass capsule navbar.
  - Added subtle top dark vignette in `.hero-top10__overlay` (`linear-gradient(180deg, rgba(8, 10, 15, 0.75) 0%, rgba(8, 10, 15, 0.25) 15%, transparent 35%, rgba(8, 10, 15, 0.95) 100%)`) providing optimal contrast and legibility for navbar links and brand icon while showcasing background art.
  - Added `padding-top: 5.5rem;` to non-hero views (`.anime-detail`, `.schedule-view`, `.library-view`, `.profile-view`) ensuring content headers never collide with the floating navbar.
  - Fully responsive on mobile (`@media (max-width: 900px)`) with compact top capsule and bottom navigation bar.

- **Task 2 — Complete Removal of ALL Top 10 Ranking UI From Hero:**
  - Removed "TOP 10 · #... THIS WEEK" eyebrow element from the Hero content hierarchy.
  - Removed `#{rank}` badge from the right-side anime poster artwork card. The poster now presents as a clean, glass-framed anime artwork card with subtle glow.
  - Removed all ranking number badges (`.hero-top10__thumb-rank`) from the thumbnail strip. Thumbnails now render as pure, sleek poster previews with active cyan borders and glow.
  - Updated carousel `aria-label` to `"Featured curated anime collection"` and thumbnail labels to `aria-label={item.title}`.
  - Preserved ranking badges and information on unrelated pages and sections (e.g. Upcoming carousel, Discover).

- **Task 3 & 4 — Root-Cause Investigation & Fix for Official Anime Logos:**
  - Traced complete logo pipeline: PostgreSQL -> Backend `/api/anime/curated-hero` & `/api/anime/logos` -> Frontend API client -> `AnimeLogo` component -> Hero slide.
  - Identified root cause: Property naming mismatch between backend response (`logoUrl`) and frontend domain interface/component (`url`), causing `logoUrl` in `AnimeLogo.tsx` to evaluate to `undefined` and prematurely trigger plain text fallback.
  - Normalized logo property contract: both `url` and `logoUrl` are now populated and accepted across `AnimeLogoResult` (backend), `UnifiedAnime.logo`, `AnimeLogo` domain interface, `fetchCuratedHeroAnime()`, `fetchAnimeLogos()`, and `AnimeLogo.tsx`.
  - Upgraded `AnimeLogo.tsx` fallback & loading behavior:
    - Never displays plain title simply because logo is loading.
    - Displays smooth aspect-ratio-constrained skeleton shimmer (`.anime-logo__skeleton`) while the image downloads, preventing layout shifts.
    - Image loads eagerly with `decoding="async"`, `object-fit: contain`, drop shadow, and smooth fade-in (`opacity: 1`).
    - Only falls back to styled title text if `!logoUrl` (genuinely unavailable) or after genuine network error (`onError`).
  - Confirmed all 10 curated anime logos permanently stored in PostgreSQL `anime_tmdb_logos` with `status = 'verified'` and `expiresAt = null`.

- **Task 5 — Clean Synopsis Rendering:**
  - Implemented `cleanSynopsis` and `cleanSynopsisText` helpers in frontend (`CinematicCarousel.tsx`, `AnimeDetailHero.tsx`, `anilist.ts`) and backend (`anime.ts`).
  - Strips `<br>` tags, raw HTML tags, decodes HTML entities (`&amp;`, `&quot;`, `&#039;`, `&lt;`, `&gt;`), and collapses redundant whitespace.
  - Fixed synopsis rendering in Hero carousel and Detail hero so literal `<br><br>` tags never appear in the UI.

- **Task 6 — Design System Preservation:**
  - Preserved existing 7Anime branding and logo.
  - Preserved horizontal rounded capsule navbar floating at top center.
  - Preserved 7500ms autoplay with pause on hover/interaction.
  - Preserved Upcoming Anime carousel and Detail page functionality.
  - Zero rectangular sidebars or full-width rectangular topbars introduced.

## Files Created

- `backend/src/scripts/test-phase3-2-curated-db.ts`
- `docs/screenshots/hero_fullbleed_desktop.png`
- `docs/screenshots/hero_curated_onepiece.png`
- `docs/screenshots/hero_curated_naruto.png`
- `docs/screenshots/hero_curated_jujutsukaisen.png`
- `docs/screenshots/hero_curated_deathnote.png`
- `docs/screenshots/mobile_hero.png`

## Files Modified

- `backend/prisma/schema.prisma`
- `backend/src/routes/anime.ts`
- `backend/src/server.ts`
- `backend/src/services/tmdb.ts`
- `docs/screenshots/capsule_navbar.png`
- `scripts/capture-screenshots.mjs`
- `src/components/anime/AnimeDetailHero.tsx`
- `src/components/anime/AnimeLogo.tsx`
- `src/components/anime/animeLogo.css`
- `src/components/carousel/CinematicCarousel.tsx`
- `src/components/carousel/rail.css`
- `src/components/navigation/navigation.css`
- `src/pages/FoundationPreview.tsx`
- `src/pages/preview.css`
- `src/services/anilist.ts`
- `src/types/domain.ts`

## Files Deleted

- `scripts/migrate-phase3-2.mjs` (temporary DDL migration script)
- `scripts/verify-10-curated.mjs` (temporary verification script)

## Architecture Decisions

- **Floating Capsule Navbar Overlay:** Positioned with `position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 50;`. This eliminates top layout gaps and allows the Hero background artwork to extend behind the navbar, while maintaining legibility via a top dark vignette and backdrop blur.
- **Dual Property Compatibility (`url` & `logoUrl`):** Unified the logo representation across all layers of the stack so that either property accesses the valid TMDB image URL, eliminating consumer-side property mismatches.
- **Zero-Flicker Logo Loading:** Replaced premature text title rendering during image loading with an aspect-ratio-constrained skeleton shimmer. The text title is reserved exclusively as a true fallback for missing or broken assets.
- **Permanent Curated Logos:** Curated Hero anime records in PostgreSQL maintain `expiresAt = null` and `status = 'verified'`, surviving Redis flushes and cold restarts without redundant upstream calls.

## Tests / Checks

- TypeScript Frontend (`npx tsc -b`): PASS (0 errors)
- TypeScript Backend (`npx tsc -p backend/tsconfig.json`): PASS (0 errors)
- Build (`npm run build`): PASS (Vite production bundle built cleanly in `dist/`)
- Curated Hero Database Persistence Test (`test-phase3-2-curated-db.ts`): PASS (111/112 assertions, verified permanent DB storage & recovery after Redis eviction)
- Browser/UI Verification (Puppeteer Chromium): PASS (Verified actual image loading for One Piece, Naruto Shippuden, Bleach, Demon Slayer, Jujutsu Kaisen, Death Note, mobile viewport, and capsule navbar)

## Verification Results

- Verified zero black gap above Hero: Hero background image starts at viewport `y = 0`.
- Verified horizontal capsule navbar floats centered above the Hero artwork.
- Verified official TMDB logos display for all slides with transparent backgrounds and sharp quality.
- Verified removal of all ranking labels ("TOP 10", "#06 THIS WEEK", poster rank badges, thumbnail rank numbers).
- Verified synopsis rendering: no literal `<br><br>` tags displayed, consistent typography and spacing.
- Verified mobile layout: responsive capsule topbar, full-bleed hero, clean thumbnails, and bottom nav.

## Known Issues

- None.

## Incomplete Work

- None.

## Follow-Up

- Proceed to Phase 4 (Streaming Provider Restructuring) when directed.

## Git State

Branch: main
Working tree: Ready to commit
Latest commit: feat: complete Phase 3.1 critical UI corrections and logo persistence

## Recovery Instructions

If work resumes in a new session:
1. Read this file.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Inspect current implementation.
5. All Phase 3.2.1 tasks are complete and verified with screenshots in `docs/screenshots/`.
6. Next phase: Phase 4 (Streaming Provider Restructuring).

## Exact Next Task

Phase 4 — Streaming Provider Restructuring (Implement Server 1: MegaPlay AniList, Server 2: MegaPlay MAL, Server 3: NXsha with `?color=purple`, and provider registry).
