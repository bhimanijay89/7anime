# 7anime — Development Status

## Current Phase

Phase 3.2.1 — Hero Layout, Ranking Removal & Permanent Anime Logo Fix

## Overall Status

Phase 3.2.1 is COMPLETE and fully verified. The unwanted black gap above the Hero carousel has been completely eliminated by positioning the original horizontal rounded capsule navbar as a fixed overlay (`position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 50`), allowing the Hero background artwork to extend all the way to the top of the viewport (`top: 0`) edge-to-edge behind the navbar. All Top 10 ranking elements ("TOP 10", "#06 THIS WEEK", poster rank badges, thumbnail rank numbers) have been removed from the Hero carousel, transforming it into a clean, curated cinematic showcase. The root cause of the missing official logos was identified (property naming mismatch `logoUrl` vs `url`) and fixed across the entire pipeline with aspect-ratio skeleton shimmer loading and zero-layout-shift containment. The synopsis text rendering bug displaying literal `<br><br>` tags was resolved by implementing HTML sanitization and entity decoding in both frontend and backend. All 10 curated anime logos are permanently stored in PostgreSQL (`status = 'verified'`, `expiresAt = null`). All TypeScript checks, production builds, database tests, and browser screenshot visual verifications pass cleanly.

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

## Current Phase Details

- [x] Remove black space above Hero: Hero background extends to top of viewport behind floating navbar
- [x] Position original capsule navbar as fixed overlay floating near top center
- [x] Complete removal of ALL Top 10 ranking labels ("TOP 10", "#06 THIS WEEK", poster rank badges, thumbnail rank numbers)
- [x] Keep polished right-side poster artwork card without ranking badge
- [x] Root cause analysis and resolution for official TMDB anime logos (resolved `logoUrl` vs `url` property mismatch)
- [x] Pure skeleton shimmer loading state in `AnimeLogo.tsx` — never displays plain title simply because logo is downloading
- [x] Resilient text fallback ONLY when logo is genuinely missing or broken
- [x] Clean synopsis rendering — stripped literal `<br><br>` tags and decoded HTML entities
- [x] Permanent PostgreSQL storage verified for all 10 curated anime (`expiresAt = null`, `status = 'verified'`)
- [x] Full TypeScript compiler checks: PASS (frontend and backend: 0 errors)
- [x] Production build verification (`npm run build`): PASS
- [x] Visual verification via Puppeteer screenshots of One Piece, Naruto, Bleach, Demon Slayer, Jujutsu Kaisen, Death Note, mobile viewport, and capsule navbar

## Upcoming Phases

- [ ] Phase 4 — Streaming Provider Restructuring (Server 1: MegaPlay AniList, Server 2: MegaPlay MAL, Server 3: NXsha with `?color=purple`, Server 4+: Extensible Provider Registry; purge `0vidads.top`)
- [ ] Phase 5 — Automatic Failover State Machine
- [ ] Phase 6 — Comprehensive Regression Testing & Full Verification

## Current Blockers

- None.

## Known Technical Debt

- None.

## Last Updated

2026-11-06

## Next Exact Action

Phase 4 — Streaming Provider Restructuring: Restructure the streaming provider architecture to replace `0vidads.top` with MegaPlay AniList, MegaPlay MAL, and NXsha.
