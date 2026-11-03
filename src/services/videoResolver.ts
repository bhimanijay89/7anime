/* =========================================================
   7ANIME — VIDEO RESOLVER SERVICE
   =========================================================

   SERVER 1 — 0vidads + TMDB ID (Default Primary Server)
     Movie: https://0vidads.top/embed/movie/{TMDB_ID}
     TV:    https://0vidads.top/embed/tv/{TMDB_ID}/{SEASON}/{EPISODE}

   SERVER 2 — megaplay.buzz + AniList ID
     https://megaplay.buzz/stream/ani/{ANILIST_ID}/{EPISODE}/{sub|dub}

   SERVER 3 — megaplay.buzz + MAL ID
     https://megaplay.buzz/stream/mal/{MAL_ID}/{EPISODE}/{sub|dub}

   ========================================================= */

import { isDevToolsActive } from '../utils/security'

export interface ResolveVideoEmbedOptions {
    server?: 'server1' | 'server2' | 'server3' | string
    tmdbId?: number | string | null
    mediaType?: 'movie' | 'tv' | string | null
    seasonNumber?: number | string | null
    anilistId: number | string
    malId?: number | string | null
    episodeNumber: number
    language?: 'sub' | 'dub'
}

/**
 * Case-insensitively determines if a media type or anime format string represents a movie.
 * Handles 'MOVIE', 'Movie', 'movie'.
 */
export function isMovieMediaType(type?: string | null): boolean {
    if (!type) return false
    return String(type).trim().toLowerCase() === 'movie'
}

/**
 * Normalizes media type string to 'movie' or 'tv'.
 * Correctly recognizes 'MOVIE', 'Movie', 'movie'.
 * Preserves 'tv' for TV series.
 */
export function normalizeMediaType(type?: string | null): 'movie' | 'tv' {
    return isMovieMediaType(type) ? 'movie' : 'tv'
}

/**
 * Resolve direct video embed URL for 7anime player.
 *
 * Server configuration:
 * - Server 1: 0vidads (Primary / Default) -> TMDB ID only.
 * - Server 2: MegaPlay -> AniList ID.
 * - Server 3: MegaPlay -> MAL ID.
 *
 * Validation & Safety:
 * - No sandbox attributes or breaking parameters.
 * - Does not silently substitute identifiers across providers.
 * - Preserves existing MegaPlay URL structures and parameters without modification.
 */
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
    if (isDevToolsActive()) {
        return ''
    }

    const safeEpisode = Math.max(
        1,
        Math.floor(Number(episodeNumber) || 1),
    )

    const safeLang =
        language === 'dub'
            ? 'dub'
            : 'sub'

    const safeAniId =
        encodeURIComponent(String(anilistId))

    const parsedMalId =
        typeof malId === 'number'
            ? malId
            : Number(malId)

    const hasValidMalId =
        Number.isInteger(parsedMalId) &&
        parsedMalId > 0

    const parsedTmdbId =
        typeof tmdbId === 'number'
            ? tmdbId
            : Number(tmdbId)

    const hasValidTmdbId =
        Number.isInteger(parsedTmdbId) &&
        parsedTmdbId > 0

    const safeSeason = Math.max(
        1,
        Math.floor(Number(seasonNumber) || 1),
    )

    const normalizedMediaType = normalizeMediaType(mediaType)

    /*
     * ---------------------------------------------------------
     * SERVER 1 (Default)
     * 0vidads + TMDB ID
     * - Movies: https://0vidads.top/embed/movie/{TMDB_ID}
     * - TV:     https://0vidads.top/embed/tv/{TMDB_ID}/{SEASON}/{EPISODE}
     * ---------------------------------------------------------
     */
    if (server === 'server1') {
        if (!hasValidTmdbId) {
            return ''
        }

        if (normalizedMediaType === 'movie') {
            return `https://0vidads.top/embed/movie/${parsedTmdbId}`
        }

        return `https://0vidads.top/embed/tv/${parsedTmdbId}/${safeSeason}/${safeEpisode}`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 2
     * megaplay.buzz + AniList ID
     * ---------------------------------------------------------
     */
    if (server === 'server2') {
        if (!safeAniId || safeAniId === 'undefined' || safeAniId === 'null') {
            return ''
        }
        return `https://megaplay.buzz/stream/ani/${safeAniId}/${safeEpisode}/${safeLang}`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 3 (also supports legacy server4 alias)
     * megaplay.buzz + MAL ID
     * ---------------------------------------------------------
     */
    if (server === 'server3' || server === 'server4') {
        if (!hasValidMalId) {
            return ''
        }

        return `https://megaplay.buzz/stream/mal/${parsedMalId}/${safeEpisode}/${safeLang}`
    }

    /*
     * ---------------------------------------------------------
     * UNKNOWN SERVER
     * ---------------------------------------------------------
     * Return an empty URL rather than silently selecting
     * another provider or ID type.
     */
    return ''
}