# 7anime — Current Checkpoint

## Current Phase

Phase 3.3 — Performance Optimization, Hero Polish & Foundation Page Cleanup

## Current Task

Site-wide performance optimization, instant Movies page navigation with client memory caching & prefetching, removal of redundant Movies catalogue from FoundationPreview, removal of manual previous/next arrows and play/pause controls from Hero carousel with thumbnail-only control, premium hover card pop-out/pop-in animations with GPU transforms, and mobile touch responsiveness.

## Status

COMPLETE

## Completed Work

- **Task 1 — Website-Wide Performance Optimization & Code Splitting:**
  - Implemented dynamic code-splitting using React `lazy` and `Suspense` for heavy views in `FoundationPreview.tsx`: `MoviesView`, `ScheduleView`, `LibraryView`, `ProfileFullView`, `FullPlayerView`, `SearchOverlay`, and `AuthModal`.
  - Main JavaScript production bundle size reduced by **20.6%** (from 364.73 kB to 288.41 kB; gzip: 87.12 kB).
  - Main CSS bundle size reduced by **49.8%** (from 135.77 kB to 68.22 kB; gzip: 12.48 kB).
  - Added in-memory client-side cache and promise deduplication table in `src/services/anilist.ts` with 5-minute TTL (`clientMemoryCache`, `clientInflightRequests`).
  - Wrapped `getAnimeMovies()`, `fetchCuratedHeroAnime()`, `getTrendingAnime()`, and `getPopularAnime()` to prevent redundant round-trips and repeated network calls during view switching.
  - Implemented background prefetching via `prefetchAnimeMovies()` triggered on browser idle (`requestIdleCallback` with 3000ms timeout) and on navbar hover (`onMouseEnter={() => onPrefetch('movies')}`).

- **Task 2 — Instant Movies Navigation & Polished Loading Skeleton:**
  - Initialized `MoviesView.tsx` directly from `getCachedAnimeMoviesSync()`, enabling instant (395ms) navigation transitions with 0ms perceived delay when cached or prefetched.
  - Built dedicated `MoviesSkeleton.tsx` with high-fidelity shimmer placeholders for header banner, spotlight presentation card, filter toolbar, and a 12-card movie grid.
  - Replaced temporary empty state with smooth skeleton loading when cache is cold, preventing layout shifts or flashes of unstyled content.

- **Task 3 — Removal of Redundant Movies Content from FoundationPreview:**
  - Removed `#movies-rail` ("Anime Movies") from the Home page in `FoundationPreview.tsx`.
  - Removed obsolete `moviesData` memo in `FoundationPreview.tsx` that filtered combined trending/top rated arrays.
  - `MoviesView.tsx` is now the sole authority for movie catalog data and rendering.
  - Preserved anime detail page movie classification, streaming provider video type resolution, and search.

- **Task 4 — Hero Carousel Polish (Removal of Arrows & Play/Pause Controls):**
  - Removed Previous slide arrow button, Next slide arrow button, and Play/Pause button from `Top10Hero` in `src/components/carousel/CinematicCarousel.tsx`.
  - The 10 curated thumbnail cards below the Hero are now the sole manual navigation control.
  - Maintained 7500ms automatic slide transitions with hover pause/resume (`onMouseEnter={() => setPaused(true)}`, `onMouseLeave={() => setPaused(false)}`).
  - Updated `rail.css` `.hero-top10__strip-area` styling to align seamlessly without orphaned button spaces.

- **Task 5 — Premium Anime Card Hover Animation:**
  - Upgraded card hover interactions in `AnimeCard.tsx`, `HoverPreviewCard.tsx`, `anime.css`, and `hoverCard.css`.
  - Implemented smooth pop-out (`hoverCardPopOut`) on mouse enter and smooth pop-in (`hoverCardPopIn`) on mouse leave with `cubic-bezier(0.22, 1, 0.36, 1)` and 340ms/260ms duration.
  - Added subtle card elevation and scale (`translateY(-4px) scale(1.02)`) on `.anime-card` with GPU-friendly transforms and soft cyan glass glow (`box-shadow: 0 14px 28px rgba(0, 0, 0, 0.6), 0 0 18px rgba(85, 216, 255, 0.16)`).
  - Added `isClosing` exit transition state in `HoverPreviewCard.tsx` preventing abrupt DOM destruction on pointer leave.
  - Added 280ms leave grace period preventing accidental dismissal when moving cursor between card and preview portal.
  - Added `@media (prefers-reduced-motion: reduce)` rules disabling transitions and animations for users with motion sensitivity.

- **Task 6 — Responsive Design & Touch Improvements:**
  - Verified touch device behavior: `window.matchMedia('(hover: none)')` prevents hover preview cards from interfering on touch screens.
  - Added mobile responsive styling for `.movies-toolbar__top` and `.movies-spotlight__content` in `movies.css`.
  - Movie genre pills support smooth horizontal touch scrolling.
  - Verified mobile layout on 390x844 viewport with compact top navbar and bottom capsule navigation.

## Files Created

- `src/components/movies/MoviesSkeleton.tsx`
- `scripts/test-phase3-3-performance.mjs`
- `docs/screenshots/home_hero.png`
- `docs/screenshots/hero_thumbnail_navigation.png`
- `docs/screenshots/anime_hover_preview.png`
- `docs/screenshots/dedicated_movies_page.png`
- `docs/screenshots/movies_page_mobile.png`
- `docs/screenshots/main_capsule_navbar.png`

## Files Modified

- `src/components/anime/AnimeCard.tsx`
- `src/components/anime/HoverPreviewCard.tsx`
- `src/components/anime/anime.css`
- `src/components/anime/hoverCard.css`
- `src/components/carousel/CinematicCarousel.tsx`
- `src/components/carousel/rail.css`
- `src/components/movies/MoviesView.tsx`
- `src/components/movies/movies.css`
- `src/components/navigation/Navigation.tsx`
- `src/pages/FoundationPreview.tsx`
- `src/services/anilist.ts`

## Files Deleted

- None.

## Architecture Decisions

- **Code-Splitting via React Lazy & Suspense:** Splitting `MoviesView`, `ScheduleView`, `FullPlayerView`, and profile views drastically lowers initial load latency and memory footprint on low-powered devices.
- **Client-Side In-Memory Cache with In-Flight Deduplication:** Added a lightweight 5-minute memory cache table in `anilist.ts` that immediately eliminates repeated network round-trips for catalog and curated hero endpoints, preventing redundant backend load and enabling instant view switching.
- **Thumbnail-Only Hero Navigation:** Streamlined the Hero UI by removing cluttering arrow and play/pause controls, creating an uncluttered cinematic presentation where the curated thumbnail strip serves as the single intuitive navigation control.
- **Graceful Hover Lifecycle:** Introducing `isClosing` state to the portal card enables smooth bidirectional pop-out and pop-in animations rather than jarring DOM element destruction.

## Tests / Checks

- TypeScript Frontend (`npx tsc -b`): PASS (0 errors)
- TypeScript Backend (`npx tsc -p backend/tsconfig.json`): PASS (0 errors)
- Build (`npm run build`): PASS (Vite production bundle built cleanly in `dist/` with code-split chunks)
- Automated Test Suite (`node scripts/test-phase3-3-performance.mjs`): PASS (All 6 test groups passed)
  - Hero has NO Previous, Next, or Play/Pause controls: PASS
  - Hero thumbnail navigation: PASS (switches slide to Naruto Shippuden)
  - Duplicate `#movies-rail` removed from Home: PASS
  - Card hover pop-out and pop-in unmount: PASS
  - Movies navigation performance: PASS (Measured 395ms transition time)
  - Mobile responsiveness & touch behavior: PASS (390x844 viewport rendered cleanly)
- Browser/UI Visual Verification: PASS (All 6 screenshots in `docs/screenshots/` verified)

## Verification Results

- Verified Hero carousel displays without arrow or play/pause buttons, with thumbnail strip as the sole navigation mechanism.
- Verified clicking thumbnails smoothly changes slides with synchronized logo, background, metadata, and poster.
- Verified Home page has no duplicate `#movies-rail` content.
- Verified card hover displays smooth pop-out preview with rating, synopsis, genres, and actions, and exits cleanly.
- Verified Movies navigation transition measured at 395ms.
- Verified mobile viewport renders clean layout with bottom navigation bar.

## Known Issues

- None.

## Incomplete Work

- None.

## Follow-Up

- Proceed to Phase 4 (Streaming Provider Restructuring) when directed.

## Git State

Branch: main
Working tree: Ready to commit
Latest commit: ec963ca (fix: connect dedicated movies view and handle hash routing with history support)

## Recovery Instructions

If work resumes in a new session:
1. Read this file.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Inspect current implementation.
5. All Phase 3.3 performance, polish, and cleanup tasks are complete and verified.
6. Next phase: Phase 4 (Streaming Provider Restructuring).

## Exact Next Task

Phase 4 — Streaming Provider Restructuring (Implement Server 1: MegaPlay AniList, Server 2: MegaPlay MAL, Server 3: NXsha with `?color=purple`, and provider registry).
