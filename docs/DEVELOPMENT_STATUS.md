# 7anime — Development Status

## Current Phase

Phase 5 — Mobile-First Hero, Profile & Permanent Anime Logo Fix

## Overall Status

Completed a comprehensive mobile-first overhaul across the Hero section, User Profile page, navigation system, and backend anime logo delivery architecture. All 10 curated anime title logos are stored as permanent optimized PNG assets in `backend/assets/hero-logos/` (and version-controlled in Git), served with 1-year immutable caching headers and CORS protection. The mobile Hero features a cinematic dark gradient overlay, prominent logo containment, non-wrapping specs, clamped synopsis, properly sized touch buttons, and a smooth touch-scrollable thumbnail carousel with safe-area end padding. The desktop floating navbar now incorporates intelligent auto-hide on downward scroll with immediate reveal on scroll up or mouse approach, ensuring the Monthly Watch Activity calendar and profile milestones are 100% unobstructed. Verified across all 5 standard viewports (320x720, 375x812, 430x932, 768x1024, 1440x900) with 0px horizontal overflow, zero TypeScript errors, and successful production build.

## Completed Phases

- [x] Phase 1 (UI) — Web UI Foundation
- [x] Phase 2 (UI) — Home Page UI
- [x] Phase 3 (UI) — Anime Discovery UI
- [x] Phase 4 (UI) — Anime Detail UI
- [x] Phase 5 (UI) — Player and Episode UI
- [x] Phase 6 (UI) — Watch Progress, Library & User Profiles
- [x] Master UI Reconciliation & Baseline Stabilization Phase
- [x] Phase 1 (Backend Architecture) — PostgreSQL + Prisma Foundation
- [x] Phase 2 (Backend Architecture) — Redis Foundation (Upstash REST Migration)
- [x] Phase 3 (Backend Architecture) — Backend API Architecture & Response Envelope
- [x] Phase 8 — Authentication System (JWT/Session) & UI Integration
- [x] Upstash Redis Integration — Remote HTTP REST Caching & Graceful Fallbacks
- [x] Google Cast & Android TV Second-Screen Integration
- [x] Dual-Hosting Architecture & Automated CI/CD Deployment
- [x] Strict 3-Server Video Streaming Architecture (Server 1: 0vidads, Server 2: MegaPlay AniList, Server 3: MegaPlay MAL)
- [x] Backend Automatic AniList ID → TMDB ID Resolution Service & Prisma Model
- [x] Command 05 — Generate and Validate Historical Baseline Locally (`0_init/migration.sql`)
- [x] Command 06 — Final Production Schema Compatibility Verification (100% Match, Zero Drift)
- [x] Command 07 — Disposable PostgreSQL Migration Replay (`7anime_migration_validation` Replay & Zero Drift Proven)
- [x] Phase 1 (Codex Upgrade) — Backend TMDB Anime Logo Resolver + Redis Caching
- [x] Phase 2 (Codex Upgrade) — TMDB Logo API Integration + Frontend Data Pipeline
- [x] Phase 3 (Codex Upgrade) — Cinematic UI Redesign + Universal Anime Logo Implementation
- [x] Phase 3.1 (Codex Upgrade) — Critical UI Corrections + Logo Persistence + Database Repair
- [x] Phase 3.2 (Codex Upgrade) — Fixed Curated Hero Collection & Permanent Logo Storage
- [x] Phase 3.2.1 (Codex Upgrade) — Hero Layout, Ranking Removal & Permanent Anime Logo Fix
- [x] Bug Fix — Movies Navigation & Dedicated Movies View
- [x] Phase 3.3 (Codex Upgrade) — Performance Optimization, Hero Polish & Foundation Page Cleanup
- [x] Phase 4 — Duolingo-Inspired Watch Streak System (Database Persistence, Timezone Awareness, 6 Flame States, Milestones)
- [x] Phase 4.1 — Critical Profile Data Accuracy Repair (Strict $\ge 80\%$ Episode Counting, Heartbeat Duration Fix, Test Seed)
- [x] Phase 4.2 — Compact Multi-Column Profile Dashboard & Refined Slimmer Capsule Navbar
- [x] Phase 4.3 — Premium Monthly Watch Activity Calendar Visual Redesign
- [x] Phase 5 — Mobile-First Hero, Profile & Permanent Anime Logo Fix

## Current Phase Details

- [x] Permanent Backend Logo Storage: 10 curated anime official transparent PNG logos bundled in `backend/assets/hero-logos/` (committed to git)
- [x] Static Asset Serving: Express static middleware at `/assets` and `/api/assets` with `Cache-Control: public, max-age=31536000, immutable` and `Access-Control-Allow-Origin: *`
- [x] Central Mapping: Exact mapping of AniList ID, TMDB ID, title, slug, asset path, dimensions, and aspect ratio in `backend/src/services/tmdb.ts`
- [x] Fast Tier-0 Resolver: `resolveTmdbLogo` and `ensureCuratedHeroLogos` serve local assets with 0ms latency and 100% offline reliability
- [x] Frontend Normalization: `anilist.ts` and `AnimeLogo.tsx` resolve relative paths to active backend origin with client offline fallback
- [x] Mobile-First Hero Redesign: Dedicated composition for 320–374px, 375–430px, 431–600px, 601–1024px, and 1025px+
- [x] Foreground Readability: Deep vertical vignette gradient preventing background artwork from dominating text and buttons
- [x] Responsive Logo Placement: Properly clamped logo sizing (`clamp(2.8rem, 11vw, 4.4rem)`) avoiding awkward stretching or overflow
- [x] Clamped Metadata: Single non-wrapping specs row, compact genre chips, 2-line clamped synopsis, standard 44px touch buttons
- [x] Horizontal Carousel: Smooth touch scrolling (`-webkit-overflow-scrolling: touch`), clear active border/scale, end padding preventing clipping
- [x] Navigation Safe-Area Clearance: Bottom margin and `calc(7.5rem + env(safe-area-inset-bottom, 0px))` clearance so mobile bottom nav never covers content
- [x] Desktop Navbar Auto-Hide on Scroll: Intelligent scroll-direction tracking slides floating capsule navbar out of view on scroll down, revealing 100% viewport for reading calendar and milestones
- [x] Global Overflow Guard: `overflow-x: hidden` and `max-width: 100vw` on `html` and `body` eliminating page-wide horizontal scroll jumps
- [x] Comprehensive 5-Viewport Verification: 320x720, 375x812, 430x932, 768x1024, and 1440x900 screenshots captured
- [x] TypeScript & Build Verification: `npx tsc -b` (0 errors), backend `tsc` (0 errors), `npm run build` (built in 12.13s)

## Upcoming Phases

- [ ] Phase 4 — Streaming Provider Restructuring (Server 1: MegaPlay AniList, Server 2: MegaPlay MAL, Server 3: NXsha with `?color=purple`, Server 4+: Extensible Provider Registry; purge `0vidads.top`)
- [ ] Phase 5 — Automatic Failover State Machine
- [ ] Phase 6 — Comprehensive Regression Testing & Full Verification

## Current Blockers

- None.

## Known Technical Debt

- None.

## Last Updated

2026-11-08

## Next Exact Action

Phase 4 — Streaming Provider Restructuring: Restructure the streaming provider architecture to replace `0vidads.top` with MegaPlay AniList, MegaPlay MAL, and NXsha.
