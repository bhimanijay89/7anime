# 7anime — Development Status

## Current Phase

Phase 4.5 — Four-Server Architecture & Dedicated Iframe Integration

## Overall Status

Completed focused video resolver audit and four-server implementation (`server1`: AnimeTVPlus MAL, `server2`: AnimeTVPlus AniList, `server3`: MegaPlay AniList, `server4`: MegaPlay MAL). Implemented direct synchronous embed URL generation with numeric validation and fallback rejection, dedicated iframe isolation (`AnimeTVPlusIframe` with strict sandbox `allow-scripts allow-forms allow-presentation` vs `MegaPlayIframe` completely unsandboxed), dynamic React keying for clean DOM teardown, and MAL ID caching with backend verification fallback. Verified across unit tests, live Puppeteer browser automation, and clean production build. Ready for user review.

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
- [x] Strict 3-Server Video Streaming Architecture (Server 1: AnimeTVPlus, Server 2: MegaPlay AniList, Server 3: MegaPlay MAL)
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
- [x] Phase 5.1 — InfinityFree CI Deployment Fix & Minimal Profile Navigation with 20 Anime Character Avatars
- [x] Phase 5.2 — Profile Dashboard Mobile Responsiveness & Streak Architecture Hardening
- [x] Phase 5.3 — GitHub Actions CI/CD Non-Blocking Lint Workflow Hardening
- [x] Phase 2 (Party Play) — Real-Time Multi-User Backend & Concurrency Engine
- [x] Phase 3 (Party Play) — Frontend Liquid Glass Party Play UI & Player Integration
- [x] Phase 4 (Party Play) — Real E2E Multi-Client & Puppeteer Browser Verification
- [x] Phase 4.1 (Party Play) — Multi-Server Selection & Synchronization Verification
- [x] Phase 4.2 (Party Play) — Watch Party Create Modal Streaming Server Dropdown Fix & Liquid Glass Theming
- [x] Phase 4.3 (Party Play & Video) — Server 1 AnimeTVPlus Migration, AniList-Primary Resolve API & Strict Iframe Sandbox
- [x] Phase 4.4 (Party Play & Video) — AnimeTVPlus Integration Completion, Failed to Fetch Root Cause Debugging & Production Verification
- [x] Phase 4.5 (Video & Party Play) — Four-Server Architecture & Dedicated Iframe Integration

## Current Phase Details

- [x] Synchronous Direct URL Generation: Rewrote `src/services/videoResolver.ts` for all 4 servers (`server1`: AnimeTVPlus MAL, `server2`: AnimeTVPlus AniList, `server3`: MegaPlay AniList, `server4`: MegaPlay MAL).
- [x] Strict Numeric ID Validation: Rejects non-positive or missing integers with empty string `""` to prevent malformed URLs.
- [x] Dedicated Iframe Isolation: Created `AnimeTVPlusIframe.tsx` (strict sandbox `allow-scripts allow-forms allow-presentation`) and `MegaPlayIframe.tsx` (unsandboxed).
- [x] Common Source Renderer: Updated `FullPlayerView.tsx` with dynamic keying `${activeServer}-${anime.id}-${currentEpisodeNumber}-${language}` for clean DOM mounting/unmounting.
- [x] MAL ID Resolver Service: Created `src/services/malResolver.ts` and backend `GET /api/anime/:anilistId/mal-id` route with Redis caching and Jikan title verification fallback.
- [x] Party Play Synchronization: Updated `src/types/party.ts`, backend contracts, modal dropdown, bar, and drawer to support all 4 servers.
- [x] Verification: TypeScript check (0 errors), production build passed (1912 modules), and Puppeteer automated verification passed (100%).

## Upcoming Phases

- [ ] Manual Git Commit & Production Deployment

## Current Blockers

- None.

## Known Technical Debt

- None.

## Last Updated

2026-11-17

## Next Exact Action

User review and approval of the Four-Server architecture and verification results.
