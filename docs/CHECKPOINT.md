# 7anime — Current Checkpoint

## Current Phase

Phase 4.5 — Four-Server Architecture & Dedicated Iframe Integration

## Current Task

Focused Video Resolver Audit & Four-Server Implementation:
- `server1`: AnimeTVPlus | MAL ID (`https://embed.animetvplus.site/home/embed/mal/{malId}/{episodeNumber}`)
- `server2`: AnimeTVPlus | AniList ID (`https://embed.animetvplus.site/home/embed/anilist/{anilistId}/{episodeNumber}`)
- `server3`: MegaPlay | AniList ID (`https://megaplay.buzz/stream/ani/{anilistId}/{episodeNumber}/{sub|dub}`)
- `server4`: MegaPlay | MAL ID (`https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/{sub|dub}`)
- Synchronous direct URL generation with integer ID validation and graceful empty string handling on missing IDs.
- Dedicated iframe isolation: `AnimeTVPlusIframe.tsx` (strict sandbox `allow-scripts allow-forms allow-presentation`) vs `MegaPlayIframe.tsx` (completely unsandboxed).
- Common source renderer in `FullPlayerView.tsx` with dynamic keying for full DOM unmount/mount between servers.
- Party Play modal, bar, and drawer UI updated to display and synchronize all 4 servers.

## Status

COMPLETE

## Completed Work

- **Focused Resolver Audit:** Audited `src/services/videoResolver.ts`, `src/services/animeTvPlus.ts`, `src/components/player/FullPlayerView.tsx`, and sandbox configurations. Identified that AnimeTVPlus embed URLs can be generated directly and synchronously using the canonical `/home/embed/` paths without asynchronous API calls or proxy dependencies.
- **Synchronous Direct URL Generation (`src/services/videoResolver.ts`):**
  - Completely rewritten to generate all four server URLs directly and synchronously.
  - Returns `""` on missing/invalid IDs to prevent malformed iframe requests (`null`, `undefined`, `NaN`).
  - Added strict numeric ID validation and clamping of episode numbers (min 1).
  - Maintained backward compatibility helper methods (`getServerProvider`, `isMovieMediaType`).
- **Dedicated Iframe Components:**
  - `src/components/player/AnimeTVPlusIframe.tsx`: Renders AnimeTVPlus embeds with strict `sandbox="allow-scripts allow-forms allow-presentation"`.
  - `src/components/player/MegaPlayIframe.tsx`: Renders MegaPlay embeds without any sandbox attribute (`sandbox={undefined}`) for cross-origin postMessage communication.
- **Common Source Renderer (`src/components/player/FullPlayerView.tsx`):**
  - Switched to synchronous `resolveVideoEmbedUrl` rendering with instant iframe mounting.
  - Dynamically renders `AnimeTVPlusIframe` for `server1`/`server2` and `MegaPlayIframe` for `server3`/`server4`.
  - Applies key switching `key={activeServer}-${anime.id}-${currentEpisodeNumber}-${language}` to cleanly unmount and remount between server switches.
  - Displays all 4 server chips in a glass selector grid beneath the player.
- **MAL ID Lookup & Caching (`src/services/malResolver.ts` & `backend/src/routes/anime.ts`):**
  - Priority: Uses `anime.idMal` provided directly in AniList metadata.
  - Fallback: Calls backend `GET /api/anime/:anilistId/mal-id` which checks Upstash Redis cache, verifies title against Jikan/MAL API, and stores verified ID.
  - Prevents assuming `malId === anilistId`.
- **Party Play Multi-Server Integration:**
  - Extended `PartyServerId` to include `'server4'` in `src/types/party.ts` and `backend/src/types/party.ts`.
  - Updated Party Create Modal (`src/components/party/PartyCreateModal.tsx`), Party Bar (`PartyBar.tsx`), and Party Drawer (`PartyDrawer.tsx`) with clear provider labels for all 4 servers.
  - Updated backend route and socket validation in `backend/src/routes/party.ts` and `backend/src/sockets/partySocket.ts`.

## Files Created

- `src/components/player/AnimeTVPlusIframe.tsx`
- `src/components/player/MegaPlayIframe.tsx`
- `src/services/malResolver.ts`
- `backend/src/scripts/test-four-servers-resolver.ts`

## Files Modified

- `src/services/videoResolver.ts`
- `src/components/player/FullPlayerView.tsx`
- `src/components/player/PlayerLoadingOverlay.tsx`
- `src/components/party/PartyCreateModal.tsx`
- `src/components/party/PartyBar.tsx`
- `src/components/party/PartyDrawer.tsx`
- `src/types/party.ts`
- `backend/src/types/party.ts`
- `backend/src/routes/anime.ts`
- `backend/src/routes/party.ts`
- `backend/src/sockets/partySocket.ts`
- `docs/CHECKPOINT.md`
- `docs/DEVELOPMENT_STATUS.md`

## Files Deleted

- None

## Architecture Decisions

- **Direct Synchronous Embed URLs:** AnimeTVPlus embed iframe URLs are generated synchronously from ID and episode number rather than making an asynchronous client-side API call.
- **Separate Component Iframe Isolation:** Rather than conditional attributes on a single iframe, distinct `AnimeTVPlusIframe` and `MegaPlayIframe` components guarantee sandbox attributes cannot leak across server changes.
- **Dynamic React Keying:** Using `${activeServer}-${anime.id}-${currentEpisodeNumber}-${language}` forces React to unmount the previous iframe DOM element completely before mounting the new one, avoiding shared state, audio leaks, or stale permissions.
- **Preservation of TMDB and IMDb:** TMDB and IMDb models and fetch routes were kept 100% untouched for future Hindi content integrations.

## Tests / Checks

- Frontend TypeScript (`tsc -b`): PASS (0 errors)
- Backend TypeScript (`tsc -p backend/tsconfig.json`): PASS (0 errors)
- Production Build (`npm run build`): PASS (0 errors, 1912 modules transformed in 1m 41s)
- Automated Four-Server Resolver & Sandbox Verification Suite (`test-four-servers-resolver.ts`): PASS (100%)
  - Part 1: All 4 server URL patterns with distinct IDs verified: PASS
  - Part 2: ID validation & missing ID rejection: PASS
  - Part 3: Provider identification: PASS
  - Part 4: Puppeteer browser UI, Party modal options, player chips, and live DOM sandbox checks: PASS
    - Server 1 (AnimeTVPlus MAL): sandbox = `allow-scripts allow-forms allow-presentation` (PASS)
    - Server 2 (AnimeTVPlus AniList): sandbox = `allow-scripts allow-forms allow-presentation` (PASS)
    - Server 3 (MegaPlay AniList): hasAttribute('sandbox') = false (PASS)
    - Server 4 (MegaPlay MAL): hasAttribute('sandbox') = false (PASS)

## Verification Results

- Confirmed all 4 server URLs match exact expected specifications.
- Verified live DOM in Google Chrome: `AnimeTVPlusIframe` renders with strict sandbox while `MegaPlayIframe` has no sandbox attribute.
- Captured automated visual proof screenshot: `four_servers_player_verification.png`.

## Known Issues

- None

## Incomplete Work

- None

## Follow-Up

- Awaiting user instruction before creating any git commits.

## Git State

Branch: main
Working tree: MODIFIED (uncommitted feature files ready for user review)

## Recovery Instructions

If work resumes in a new session:
1. Read this file.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Continue with next requested feature.

## Exact Next Task

Phase complete. Wait for user review and approval before proceeding or creating git commit.
