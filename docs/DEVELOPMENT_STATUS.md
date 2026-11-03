# 7anime — Development Status

## Current Phase

Phase 3.1 — Critical UI Corrections + Logo Persistence + Database Repair

## Overall Status

Phase 3.1 is COMPLETE and verified. The original horizontal capsule navbar has been forcefully restored near the top center, purging the unintended sidebar and rectangular top bar. The Top 10 Hero height has been expanded to near-fullscreen (`clamp(48rem, 82vh, 60rem)`), visibly larger than the Upcoming Anime carousel (`28rem`), with autoplay configured to 7500ms. The anime detail page background cover container height has been increased to `clamp(34rem, 50vh, 44rem)`. Universal TMDB anime logos are rendered across all three designated locations (Top 10 Hero, Upcoming Anime carousel, and Detail page) with resilient fallback typography. The missing database table issue has been resolved with PostgreSQL DDL migrations for `anime_tmdb_mappings` and `anime_tmdb_logos`, establishing dual-tier caching (Redis + PostgreSQL) with 7-day durability and negative result caching. All TypeScript, build, backend, and browser screenshot checks pass with zero errors.

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

## Current Phase

- [x] Restore original horizontal capsule navbar (`.desktop-nav`) floating near top center
- [x] Remove vertical sidebar and full-width topbar
- [x] Expand Top 10 Hero height to near-fullscreen (`clamp(48rem, 82vh, 60rem)`)
- [x] Set Top 10 Hero autoplay interval to 7500ms with pause on interaction
- [x] Increase anime detail page cover container height to `clamp(34rem, 50vh, 44rem)`
- [x] Universal TMDB anime logo rendering across Hero, Upcoming, and Detail pages
- [x] Resilient text fallback in `AnimeLogo.tsx` preventing empty flicker during CDN load
- [x] Fix database missing table error for `anime_tmdb_mappings` and `anime_tmdb_logos`
- [x] Dual-tier logo caching: Redis (30d) + PostgreSQL (7d) with negative result caching (7d)
- [x] Full TypeScript compiler verification (frontend and backend: 0 errors)
- [x] Production build verification (`vite build`: 0 errors)
- [x] Visual verification via Puppeteer screenshots (`capsule_navbar.png`, `hero_top10_onepiece.png`, `anime_detail.png`, etc.)

## Upcoming Phases

- [ ] Phase 4 — Streaming Provider Restructuring (Server 1: MegaPlay AniList, Server 2: MegaPlay MAL, Server 3: NXsha with `?color=purple`, Server 4+: Extensible Provider Registry; purge `0vidads.top`)
- [ ] Phase 5 — Automatic Failover State Machine
- [ ] Phase 6 — Comprehensive Regression Testing & Full Verification

## Current Blockers

- None.

## Known Technical Debt

- None.

## Last Updated

2026-11-04

## Next Exact Action

Begin Phase 4 — Streaming Provider Restructuring (re-order streaming servers: Server 1 MegaPlay AniList, Server 2 MegaPlay MAL, Server 3 NXsha `?color=purple`, create Extensible Provider Adapter Registry, and purge `0vidads.top`).
