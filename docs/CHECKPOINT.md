# 7anime — Current Checkpoint

## Current Phase

4-Server Video Provider System System Complete

## Current Task

Wiring and completion of the 4-server video provider system without changing any UI elements, establishing strict URL generation rules per server, updating `videoResolver.ts` and `FullPlayerView.tsx`, and verifying Bleach and One Piece embed URLs.

## Status

COMPLETE

## Completed Work

### 1. 4-Server Provider Contract Implementation
- **Server 1 (`server1`)**: `https://ani.megaplay.su/ani/{ANILIST_ID}/{EPISODE}/{sub|dub}?color=%237c5cfc`
- **Server 2 (`server2`)**: `https://megaplay.buzz/stream/ani/{ANILIST_ID}/{EPISODE}/{sub|dub}`
- **Server 3 (`server3`)**: `https://ani.megaplay.su/mal/{MAL_ID}/{EPISODE}/{sub|dub}?color=%237c5cfc`
- **Server 4 (`server4`)**: `https://megaplay.buzz/stream/mal/{MAL_ID}/{EPISODE}/{sub|dub}`

### 2. Strict ID Strategy & Theme Color Enforcement
- Enforced strict ID strategies: Server 1/2 strictly use AniList ID; Server 3/4 strictly use MAL ID.
- Added `?color=%237c5cfc` query parameter exclusively to Server 1 and Server 3 (`ani.megaplay.su`).
- Return controlled empty string `''` when Server 3 or 4 lacks a valid `malId` without silent ID strategy switching.

### 3. Player Integration & Clean Up
- Mapped `server1`, `server2`, `server3`, `server4` buttons in `FullPlayerView.tsx`.
- Removed obsolete `'megaplay'` server string defaults across `anilist.ts` and `FullPlayerView.tsx`.
- Retained React key remounting (`<iframe key={`${embedUrl}`} src={embedUrl} ... />`) when server, language, or episode changes.

## Files Modified

- `src/services/videoResolver.ts` — Implemented exact 4-server provider contract and theme color rules.
- `src/services/anilist.ts` — Updated `getMegaPlayEmbedUrl` default server parameter to `server1`.
- `src/components/player/FullPlayerView.tsx` — Cleaned up server state checks and mapped Server 1..4 buttons cleanly.
- `docs/CHECKPOINT.md` — Updated checkpoint documentation.
- `docs/DEVELOPMENT_STATUS.md` — Updated development status tracker.

## Tests / Checks

- ESLint (`npm run lint`): PASS (0 errors)
- Frontend Production Build (`npm run build`): PASS (5.01s)
- Contract Verification (Bleach TYBW Part 4 & One Piece): 100% MATCH on all 4 servers for SUB/DUB/Episodes.

## Known Issues

- None.

## Follow-Up

- Deploy updated frontend build to production.

## Git State

Branch: main
Working tree: MODIFIED

## Recovery Instructions

If work resumes in a new session:

1. Read this file.
2. Read `docs/DEVELOPMENT_STATUS.md`.
3. Inspect `git status`.

## Exact Next Task

Phase completed. Await user instruction / next phase directive.
