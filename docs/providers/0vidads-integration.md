# 0vidads Streaming Provider Integration — 7Anime

## 1. Provider Overview & Architecture

0vidads is integrated as **Server 1**, serving as the default primary streaming server for 7Anime.

To protect platform integrity and confidentiality, external provider identities and internal implementation details are completely isolated from the public user interface. All public-facing components refer to this server generically as **Server 1**.

### 3-Server Strategy
- **Server 1 (Default):** 0vidads via TMDB ID only.
- **Server 2:** MegaPlay via AniList ID (`https://megaplay.buzz/stream/ani/${safeAniId}/${safeEpisode}/${safeLang}`).
- **Server 3:** MegaPlay via MAL ID (`https://megaplay.buzz/stream/mal/${parsedMalId}/${safeEpisode}/${safeLang}`).

---

## 2. Official Embed Formats

0vidads requires TMDB identifiers exclusively. It does not accept AniList IDs, MyAnimeList (MAL) IDs, or arbitrary query parameters.

### A. Anime Movies
Format:
```
https://0vidads.top/embed/movie/{TMDB_ID}
```
Example:
```
https://0vidads.top/embed/movie/37854
```

### B. Anime TV Series
Format:
```
https://0vidads.top/embed/tv/{TMDB_ID}/{SEASON}/{EPISODE}
```
Example:
```
https://0vidads.top/embed/tv/37854/1/1
```

### Constraints & Validation:
- TMDB ID must be a valid positive integer.
- Season and episode numbers must be valid positive integers (defaulting to season 1 when unspecified).
- Undocumented query parameters (such as `sub`, `dub`, `autoplay`, or third-party IDs) are strictly forbidden and omitted.
- No sandbox attributes are added to the iframe to preserve player playback, controls, and fullscreen permissions.

---

## 3. Automatic AniList → TMDB Identifier Resolution

Because AniList remains 7Anime's canonical anime metadata source, a backend-mediated resolution pipeline translates AniList IDs into verified TMDB IDs without exposing provider APIs or secret credentials to the client.

### 4-Tier Resolution Architecture:
1. **Tier 1 — Upstash Redis Cache:**
   - Key: `anime:tmdb:{anilistId}`
   - TTL: 30 days
   - Latency: < 10ms
2. **Tier 2 — PostgreSQL Persistence:**
   - Table: `anime_tmdb_mappings` (Prisma model `AnimeTmdbMapping`)
   - Stores verified mappings (`anilistId`, `tmdbId`, `mediaType`, `season`, `confidence`, `source`).
3. **Tier 3 — Curated Baseline Seed Map:**
   - Built-in verified high-confidence mappings for top anime (One Piece, Naruto, Bleach, Attack on Titan, Demon Slayer, Jujutsu Kaisen, Frieren, Solo Leveling, Death Note, etc.).
   - Guarantees instant offline/ISP-resilient resolution in local development environments.
4. **Tier 4 — Live TMDB API Search with Strict Anime Verification:**
   - Search query: Anime title / Romaji title / English title + release year.
   - Strict validation: Candidate must match Genre 16 (Animation) or have an East Asian original language (`ja`, `zh`, `ko`).
   - Weak, ambiguous, or non-animation results are rejected.
   - Successful resolutions are cached to Redis and persisted to PostgreSQL.

---

## 4. Frontend Resolver Implementation

The core frontend resolver is located in `src/services/videoResolver.ts`:

```typescript
export function resolveVideoEmbedUrl({
  server = 'server1',
  tmdbId,
  mediaType,
  seasonNumber = 1,
  malId,
  anilistId,
  episodeNumber,
  language = 'sub',
}: ResolveVideoEmbedOptions): string {
  // Security guard against unauthorized inspection tools
  if (isDevToolsActive()) return ''

  // Server 1 — 0vidads via TMDB ID
  if (server === 'server1') {
    if (!hasValidTmdbId) return ''
    if (normalizedMediaType === 'movie') {
      return `https://0vidads.top/embed/movie/${parsedTmdbId}`
    }
    return `https://0vidads.top/embed/tv/${parsedTmdbId}/${safeSeason}/${safeEpisode}`
  }

  // Server 2 — MegaPlay via AniList ID
  if (server === 'server2') {
    return `https://megaplay.buzz/stream/ani/${safeAniId}/${safeEpisode}/${safeLang}`
  }

  // Server 3 — MegaPlay via MAL ID
  if (server === 'server3' || server === 'server4') {
    if (!hasValidMalId) return ''
    return `https://megaplay.buzz/stream/mal/${parsedMalId}/${safeEpisode}/${safeLang}`
  }

  return ''
}
```

---

## 5. Player Compatibility & Server Switching

- **Default Server:** Server 1 (0vidads) is selected by default on player launch.
- **State Preservation:** Switching between Server 1, Server 2, and Server 3 preserves the selected anime, episode number, season, and current playback progress.
- **Audio Switcher (SUB/DUB):**
  - Server 1 embeds multi-audio and subtitles directly within its player interface (`Multi-Audio (In-Player)`).
  - Server 2 and Server 3 utilize the application-level SUB / DUB chips.
- **Graceful Error Recovery:**
  - If Server 1 mapping is unavailable or pending, the player renders a cinema fallback card with one-click action buttons to switch to Server 2 or Server 3 immediately.

---

## 6. Provider Privacy & Technical Transparency

- **UI Isolation:** No external provider names ("0vidads", "MegaPlay", "AniList", "TMDB") appear in user-facing controls, chips, banners, or notifications.
- **Iframe Visibility:** Standard third-party iframe embeds transmit HTTP requests to their respective hosts; the iframe source is technically inspectable in browser dev tools. Reverse-proxying video streams without provider authorization violates third-party terms of service and CDN protections; 7Anime protects provider identity at the application presentation layer while maintaining direct embed compliance.
- **Content Security Policy:** `vercel.json` allows `https://0vidads.top` and `https://*.0vidads.top` in `frame-src`.
