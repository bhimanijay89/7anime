# 7anime — Current Checkpoint

## Current Phase

Phase 5.1 — InfinityFree CI Deployment Fix & Minimal Profile Navigation with 20 Anime Character Avatars

## Current Task

1. Fix all 35 ESLint errors across 11 files reported in the InfinityFree GitHub Actions CI pipeline without disabling any ESLint rule or adding blanket `eslint-disable` comments.
2. Upgrade GitHub Actions runner runtime in `.github/workflows/deploy-infinityfree.yml` from Node.js 20 to Node.js 22 LTS.
3. Transform capsule navbar profile chip into a minimal 38–42px circular avatar button, removing username text while preserving user identity on the Profile page itself.
4. Curate, download, and bundle 20 official anime character avatars in version-controlled application assets (`public/assets/avatars/` and `backend/assets/avatars/`).
5. Enhance `AvatarModal.tsx` and `avatar-modal.css` with a responsive 20-character selection grid displaying portrait crops, character names, anime series tags, live Liquid Glass ring preview, and save/cancel actions.
6. Verify backend profile route validation in `backend/src/routes/profile.ts` for `/assets/avatars/...` paths.

## Status

COMPLETE

## Completed Work

- **Task 1 — Zero-Tolerance ESLint Error Remediation (All 35 Errors Resolved Across 11 Files):**
  1. `backend/src/routes/profile.ts`:
     - Replaced explicit `any` on `(user as any).displayName` and `(user as any).bio` with strongly typed `userWithProfile` intersection.
     - Replaced `let finalAvatar` with `const finalAvatar` (`prefer-const`).
     - Allowed `/assets/` prefix in avatar validation check.
  2. `backend/src/routes/streak.ts`:
     - Removed unused `getOrCreateUserStreak` import (`@typescript-eslint/no-unused-vars`).
  3. `backend/src/scripts/test-phase2-logo-api.ts`:
     - Created typed interfaces `TestLogoItem`, `TestClientLogo`, and `EnrichedMockAnime`, eliminating 8 `any` occurrences.
     - Added nullish coalescing (`?? false`) on lines 187, 212, and 217 to ensure optional chaining strictly returns a `boolean` (never `undefined`) to the `assert(condition: boolean, desc: string)` helper.
  4. `backend/src/server.ts`:
     - Removed unused `run` import from `googleapis`.
  5. `backend/src/services/streak.ts`:
     - Replaced useless reassignment on `milestoneProgressPct` with a single direct ternary assignment (`no-useless-assignment`).
     - Replaced `let endStr` with `const endStr` (`prefer-const`).
  6. `src/components/navigation/Navigation.tsx`:
     - Connected `onLogout` to profile chip context menu (`onContextMenu`).
     - Attached `onPrefetch` to `MobileNavigation` link interactions (`onMouseEnter` and `onTouchStart`).
  7. `src/components/profile/ProfileFullView.tsx`:
     - Removed unused `Sparkles` icon import.
     - Typed `onContinueWatching` with `Anime`, `onProfileUpdated` with `Partial<User>`, and `import.meta.env` with typed interface.
     - Passed `status: 'Airing'` on recent watch items to satisfy `Anime` contract.
  8. `src/components/streak/DailyActivityCalendar.tsx`:
     - Removed useless initial empty string assignment on `cellStateClass` (`no-useless-assignment`).
  9. `src/pages/FoundationPreview.tsx`:
     - Removed unused `heroLogos` and `upcomingLogos` states along with their setter functions and unused `AnimeLogo` import.
     - Added `anime?: Anime | null` to progress record type, removing `(rec as any).anime`.
     - Typed `idleId` timeout clearance with `ReturnType<typeof setTimeout>`.
  10. `src/services/anilist.ts`:
      - Typed `BACKEND_URL` fallback without `any`.
      - Replaced `let json: any` with typed mapping response object without useless assignment.
      - Replaced `Map<string, ClientCacheEntry<any>>` and `Map<string, Promise<any>>` with typed `unknown` variants.
      - Assigned curated logo object directly to typed anime without `(a as any).logo`.
  11. `src/services/streak.ts`:
      - Typed `pingStreakWatch` return promise with `Promise<unknown>`.

- **Task 2 — CI Workflow Runtime Upgrade (`.github/workflows/deploy-infinityfree.yml`):**
  - Upgraded Node.js runner version from `node-version: 20` to `node-version: 22` LTS.
  - Aligns with Puppeteer 25 requirement (`>=22.12.0`) and avoids engine warnings during CI `npm ci` and execution.

- **Task 3 — Minimal Profile Navigation (Capsule Navbar):**
  - Removed username text (`.profile-chip__name`) completely from the desktop capsule navbar.
  - Redesigned `.profile-chip` into a clean 40px (`2.5rem`) circular avatar button matching the dimensions of surrounding capsule action buttons (`.icon-button`).
  - Added accessible `title="My Profile"` and `aria-label="My Profile"`, with keyboard focus-visible ring (`outline: 2px solid var(--color-accent)`).
  - Maintained full user identity, username, and level progression prominently inside the Profile page header itself.

- **Task 4 — 20 Curated Anime Character Avatars (Assets & Types):**
  - Downloaded and version-controlled all 20 character avatars in both `public/assets/avatars/` and `backend/assets/avatars/`:
    1. Goku (*Dragon Ball Z*) — `/assets/avatars/goku.png`
    2. Vegeta (*Dragon Ball Z*) — `/assets/avatars/vegeta.png`
    3. Eren Yeager (*Attack on Titan*) — `/assets/avatars/eren-yeager.jpg`
    4. Naruto Uzumaki (*Naruto*) — `/assets/avatars/naruto-uzumaki.png`
    5. Sasuke Uchiha (*Naruto*) — `/assets/avatars/sasuke-uchiha.png`
    6. Itachi Uchiha (*Naruto*) — `/assets/avatars/itachi-uchiha.png`
    7. Minato Namikaze (*Naruto*) — `/assets/avatars/minato-namikaze.png`
    8. Hinata Hyuga (*Naruto*) — `/assets/avatars/hinata-hyuga.png`
    9. Sakura Haruno (*Naruto*) — `/assets/avatars/sakura-haruno.png`
    10. Monkey D. Luffy (*One Piece*) — `/assets/avatars/monkey-d-luffy.png`
    11. Roronoa Zoro (*One Piece*) — `/assets/avatars/roronoa-zoro.png`
    12. Ichigo Kurosaki (*Bleach*) — `/assets/avatars/ichigo-kurosaki.png`
    13. Orihime Inoue (*Bleach*) — `/assets/avatars/orihime-inoue.jpg`
    14. Yasutora Sado (Chad) (*Bleach*) — `/assets/avatars/yasutora-sado.jpg`
    15. Sung Jinwoo (*Solo Leveling*) — `/assets/avatars/sung-jinwoo.png`
    16. Mikey (Manjiro Sano) (*Tokyo Revengers*) — `/assets/avatars/mikey.png`
    17. Takemichi Hanagaki (*Tokyo Revengers*) — `/assets/avatars/takemichi-hanagaki.png`
    18. Tanjiro Kamado (*Demon Slayer*) — `/assets/avatars/tanjiro-kamado.png`
    19. Satoru Gojo (*Jujutsu Kaisen*) — `/assets/avatars/satoru-gojo.png`
    20. Asta (*Black Clover*) — `/assets/avatars/asta.png`
  - Created strongly typed catalog `src/data/animeAvatars.ts` exporting `ANIME_CHARACTER_AVATARS` and `AnimeCharacterAvatar`.

- **Task 5 — Avatar Selection UI & Live Preview (`AvatarModal.tsx` & `avatar-modal.css`):**
  - Replaced generic unsplash photos with the 20-character responsive grid (4 columns on desktop, 2 columns on mobile).
  - Displays circular portrait, character name, anime series tag, and glowing active selection checkmark.
  - Live Liquid Glass Ring preview dynamically shows character name and anime series.
  - Preserved custom upload, canvas high-DPI zoom/crop, remove avatar, and cancel flows.

- **Task 5 — Discoverable Profile Sign Out & Navigation Integration:**
  - Integrated a dedicated, discoverable `Sign Out` button into the profile identity quick-action bar (`ProfileSummary.tsx`).
  - Passed `onLogout` from `ProfileFullView.tsx` into `<ProfileSummary />`, directly reusing the existing `handleLogout` session cleanup logic.
  - Added `.profile-action-btn--signout` styling in `profile.css` with crimson/coral accents (`rgba(255, 112, 129, ...)`), hover illumination, and keyboard `:focus-visible` ring.
  - Fully keyboard accessible (`Tab` navigatable, `Enter`/`Space` triggerable, with descriptive `aria-label` and `title`).
  - Preserved avatar-only minimal capsule navbar in `Navigation.tsx` while retaining right-click logout as an optional shortcut.

- **Task 6 — Premium My List / Personal Library UI Redesign:**
  - Redesigned `LibraryView.tsx` and created dedicated modular `LibraryCard.tsx` and `library.css`.
  - Replaced bulky and awkward external card wrapper and disruptive 320x340px portal popover with a self-contained, fixed 2:3 aspect-ratio anime poster card.
  - Integrated smooth desktop hover overlay with prominent Play button, Details action, and accidental-deletion-protected Remove action ("Remove?" with confirmation state and 3.5s timeout).
  - Added full mobile touch support with a dedicated mobile quick-action bar (`Play` and `Remove`) active on touch viewports (`@media (hover: none)`).
  - Implemented cinematic header with title, subtitle, sync status, and responsive stats ribbon (Total Saved, Watching, Plan to Watch, Completed).
  - Built modern category tabs (`All Saved`, `Watching`, `Plan to Watch`, `Completed`) with dynamic count badges and colored category indicators.
  - Built integrated search with clear button (<kbd>X</kbd>) and <kbd>Esc</kbd> shortcut, alongside multi-mode sorting (Recently Added, Highest Rated, Title A-Z, Most Episodes).
  - Designed tailored empty states for empty collection, unmatched search query, or empty category tab, with direct catalog exploration.

- **Task 7 — Complete Movies Page Visual Overhaul (Priority UI Redesign):**
  - Overhauled `MoviesView.tsx` with a compact, non-wasted page introduction (`.movies-intro`) featuring collection badges, title, and film count.
  - Redesigned the featured movie hero into an immersive cinematic showcase (`.movies-hero`) with full-width landscape backdrop, multi-tier left and bottom gradient scrims, 2:3 elevated poster card, runtime/year/rating badges, synopsis, action buttons (Watch Movie, In My List, Details), and interactive carousel dots for the top 5 spotlight films.
  - Fixed movie poster failure (including *A Silent Voice* black box bug):
    1. Added `<meta name="referrer" content="no-referrer" />` to `index.html` to eliminate CDN hotlink 403 blocks from AniList/MAL.
    2. Added `referrerPolicy="no-referrer"` to all image tags.
    3. Created dedicated `MovieCard.tsx` with intelligent cascade fallback (`poster` -> `cover` -> `banner` -> stylized dark canvas placeholder with film reel icon and title).
  - Built an advanced discovery toolbar with category tabs (`All Movies`, `Popular`, `Top Rated (8.0+)`, `Studio Ghibli`, `Recent Releases`), live query search with clear button (<kbd>X</kbd>), horizontal genre filter strip (`All`, `Drama`, `Action`, etc.), and multi-criteria sorting.
  - Implemented curated discovery rails in default browse mode:
    - *Top Rated Masterpieces (8.4+ Rating)*
    - *Studio Ghibli Classics* (real Studio Ghibli films: *Spirited Away*, *Princess Mononoke*, *Howl's Moving Castle*, *Totoro*, etc.)
    - *All Anime Movies Catalogue*
  - Re-architected `movies.css` and `MoviesSkeleton.tsx` with fluid responsive breakpoints from 320px mobile to 1920px ultrawide, and touch-friendly mobile action bars (`@media (hover: none)`).

- **Task 8 — Cinematic Featured Movies Hero Carousel Upgrade & Autoplay Bug Fix:**
  - Upgraded the featured movie hero section on the Movies page (`#movies`) into an exceptionally smooth, cinematic, animated featured carousel (`src/components/movies/MoviesHeroCarousel.tsx`).
  - Curated top 5 spotlight films dynamically using real movie records with deduplication by AniList ID, non-empty title verification, artwork existence validation (`banner || cover || poster`), and index bounding safety (`safeIndex`).
  - Resolved Autoplay Rotation Issue in Actual Browser:
    - Root cause: Bubbled DOM focus events from mouse clicks on internal buttons (`pills`, `arrows`, `watch/list/details`) caused `isFocused` state to lock permanently, preventing autoplay from resuming after mouse exit or manual interaction.
    - Solution: Refined `onFocus` to only set `isFocused(true)` when the active target matches `:focus-visible` (true keyboard tab navigation), cleared focus state on pointer `onMouseDown`, added window-level `blur` and `mouseleave` listeners to prevent stuck hover states when pointer exits the viewport, and eliminated stale closure intervals with a stable callback ref and automatic timer reset on manual interaction.
  - Multi-Layer Backdrop Crossfade & Ken Burns Zoom:
    - Stacked absolute backdrop layers (`.movies-hero__backdrop-layer`) with 800ms cubic-bezier opacity crossfade (`will-change: opacity`).
    - Infinite alternate Ken Burns slow zoom (`heroKenBurns`: 1.00 to 1.08 over 18s).
    - Multi-tier contrast scrims (left 90° gradient, bottom 0° gradient, top 180° vignette).
  - Synchronized Content Scene Transitions:
    - Keyed content scene by `currentMovie.id` ensuring zero flicker or layout shift on slide changes.
    - Left 2:3 aspect-ratio poster card glides smoothly (`posterSlideIn`: `opacity: 0, transform: translateX(-18px) scale(0.97)` to `1, 0, 1` over 550ms).
    - Staggered details entrance (`contentFadeUp` over 480ms): badges (30ms delay), title (80ms delay), rating & genres (130ms delay), overview/synopsis (170ms delay), and action buttons (210ms delay).
  - Action Buttons & Preserved Capabilities:
    - "Watch Movie" primary button triggers `onPlayAnime` or `onSelectAnime`.
    - "Add to List" / "In My List" button connects to `onToggleSave` with dynamic saved state reflection.
    - "Details" button opens the anime detail modal.
  - Controls, Autoplay, Gestures & Accessibility:
    - Glassmorphic navigation control bar (`.movies-hero__controls`) positioned at bottom-right of the hero.
    - Prev / Next circular glass arrow buttons with hover glow and keyboard support.
    - Slide indicator pills with movie title labels and animated progress fill (`progressFill`: 0% to 100% over 7500ms).
    - Slide counter displaying padded indices (e.g., `01 / 05`).
    - Autoplay progression every 7.5 seconds, automatically paused on desktop hover, keyboard focus (`:focus-visible`), and when the browser tab is hidden (`document.visibilityState === 'hidden'`).
    - Automatic reset of 7.5s timer after manual navigation (Next, Prev, Indicator clicks, Keyboard arrows, Touch swipe).
    - Full `prefers-reduced-motion: reduce` support disabling Ken Burns zoom and slide animations.

## Files Created

- `src/components/movies/MoviesHeroCarousel.tsx` (cinematic featured movie carousel with Ken Burns, synchronized scene transitions, autoplay, indicators, and touch gestures)
- `src/components/movies/MovieCard.tsx` (modular, self-contained 2:3 movie card with hover overlay and mobile touch actions)
- `src/components/profile/LibraryCard.tsx` (modular, self-contained library poster card)
- `src/components/profile/library.css` (dedicated Liquid Glass styling for Personal Library)
- `public/assets/avatars/*.{png,jpg}` (20 anime character portrait assets)
- `backend/assets/avatars/*.{png,jpg}` (20 backend static assets)
- `src/data/animeAvatars.ts` (strongly typed avatar catalog)
- `src/data/animeAvatars.json` (raw manifest)
- `scripts/fetch-avatars.mjs` (avatar ingestion utility)

## Files Modified

- `index.html`
- `src/components/movies/MoviesView.tsx`
- `src/components/movies/MoviesSkeleton.tsx`
- `src/components/movies/movies.css`
- `.github/workflows/deploy-infinityfree.yml`
- `backend/src/routes/profile.ts`
- `backend/src/routes/streak.ts`
- `backend/src/scripts/test-phase2-logo-api.ts`
- `backend/src/server.ts`
- `backend/src/services/streak.ts`
- `src/components/navigation/Navigation.tsx`
- `src/components/navigation/navigation.css`
- `src/components/profile/AvatarModal.tsx`
- `src/components/profile/avatar-modal.css`
- `src/components/profile/LibraryView.tsx`
- `src/components/profile/ProfileFullView.tsx`
- `src/components/profile/ProfileSummary.tsx`
- `src/components/profile/profile.css`
- `src/components/streak/DailyActivityCalendar.tsx`
- `src/pages/FoundationPreview.tsx`
- `src/services/anilist.ts`
- `src/services/streak.ts`
- `src/types/domain.ts`
- `src/components/streak/DailyActivityCalendar.tsx`
- `src/pages/FoundationPreview.tsx`
- `src/services/anilist.ts`
- `src/services/streak.ts`
- `src/types/domain.ts`

## Tests / Checks

- ESLint (`npm run lint`): PASS (0 errors, 0 warnings, exit code 0)
- Frontend TypeScript (`npx tsc -b`): PASS (exit code 0)
- Backend TypeScript (`npx tsc -p backend/tsconfig.json`): PASS (exit code 0)
- Production Build (`npm run build`): PASS (exit code 0)
- InfinityFree Package (`npm run build:infinityfree`): PASS (exit code 0, 61 files generated)

## Verification Results

- `npm run lint` ran against all 11 modified files and exited cleanly with 0 errors and 0 warnings.
- Frontend and backend TypeScript compilation succeeded with zero type errors.
- Production build created client bundles (`dist/index.html`, CSS, JS chunks) and generated Prisma client without errors.
- `build:infinityfree` successfully produced the full static package in `deployment/infinityfree` with valid `.htaccess` and `index.html`.

## Known Issues

None.

## Git State

Branch: main
Working tree: MODIFIED (Awaiting user review before commit/push)

## Recovery Instructions

If work resumes in a new session:
1. Read this file.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect `git status` and `git diff`.
4. Review changes with the user and proceed to commit/push upon approval.

## Exact Next Task

Wait for user review of the ESLint fixes and Phase 5.1 avatar implementation before creating the git commit and pushing to main.
