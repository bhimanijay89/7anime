/* =========================================================
   7ANIME — VIDEO RESOLVER SERVICE (FOUR-SERVER ARCHITECTURE)
   =========================================================

   SERVER 1 — AnimeTVPlus + MAL ID
     URL: https://embed.animetvplus.site/home/embed/mal/{malId}/{episodeNumber}

   SERVER 2 — AnimeTVPlus + AniList ID
     URL: https://embed.animetvplus.site/home/embed/anilist/{anilistId}/{episodeNumber}

   SERVER 3 — MegaPlay + AniList ID
     URL: https://megaplay.buzz/stream/ani/{anilistId}/{episodeNumber}/{sub|dub}

   SERVER 4 — MegaPlay + MAL ID
     URL: https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/{sub|dub}

   ========================================================= */

import { isDevToolsActive } from '../utils/security'

export const ANIMETVPLUS_EMBED_BASE = 'https://embed.animetvplus.site/home/embed'
export const MEGAPLAY_STREAM_BASE = 'https://megaplay.buzz/stream'

export type ServerId = 'server1' | 'server2' | 'server3' | 'server4'

export interface ServerConfig {
    id: ServerId
    name: string
    provider: 'AnimeTVPlus' | 'MegaPlay'
    identifierType: 'MAL' | 'AniList'
    description: string
}

export const SERVER_CONFIGS: Record<ServerId, ServerConfig> = {
    server1: {
        id: 'server1',
        name: 'Server 1',
        provider: 'AnimeTVPlus',
        identifierType: 'MAL',
        description: 'AnimeTVPlus (MAL ID)',
    },
    server2: {
        id: 'server2',
        name: 'Server 2',
        provider: 'AnimeTVPlus',
        identifierType: 'AniList',
        description: 'AnimeTVPlus (AniList ID)',
    },
    server3: {
        id: 'server3',
        name: 'Server 3',
        provider: 'MegaPlay',
        identifierType: 'AniList',
        description: 'MegaPlay (AniList ID)',
    },
    server4: {
        id: 'server4',
        name: 'Server 4',
        provider: 'MegaPlay',
        identifierType: 'MAL',
        description: 'MegaPlay (MAL ID)',
    },
}

export interface ResolveVideoEmbedOptions {
    server?: ServerId | string
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
 */
export function isMovieMediaType(type?: string | null): boolean {
    if (!type) return false
    return String(type).trim().toLowerCase() === 'movie'
}

/**
 * Normalizes media type string to 'movie' or 'tv'.
 */
export function normalizeMediaType(type?: string | null): 'movie' | 'tv' {
    return isMovieMediaType(type) ? 'movie' : 'tv'
}

/**
 * Returns provider type for the given server ID.
 */
export function getServerProvider(server?: string): 'AnimeTVPlus' | 'MegaPlay' | null {
    if (server === 'server1' || server === 'server2') return 'AnimeTVPlus'
    if (server === 'server3' || server === 'server4') return 'MegaPlay'
    return null
}

/**
 * Validates whether an ID is a valid positive integer.
 */
export function isValidPositiveIntegerId(value: unknown): value is number {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0 && !isNaN(value) && isFinite(value)
    }
    if (typeof value === 'string' && value.trim()) {
        const num = Number(value.trim())
        return Number.isInteger(num) && num > 0 && !isNaN(num) && isFinite(num)
    }
    return false
}

/**
 * Resolve direct video embed URL for 7Anime player.
 *
 * All four server URLs are generated directly and synchronously:
 * - Server 1: AnimeTVPlus (MAL ID) -> https://embed.animetvplus.site/home/embed/mal/{malId}/{episodeNumber}
 * - Server 2: AnimeTVPlus (AniList ID) -> https://embed.animetvplus.site/home/embed/anilist/{anilistId}/{episodeNumber}
 * - Server 3: MegaPlay (AniList ID) -> https://megaplay.buzz/stream/ani/{anilistId}/{episodeNumber}/{sub|dub}
 * - Server 4: MegaPlay (MAL ID) -> https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/{sub|dub}
 *
 * Safety & Validation:
 * - Never returns URLs with undefined, null, or NaN in place of IDs.
 * - Never assumes MAL ID equals AniList ID.
 * - Returns empty string ("") if the required ID for the requested server is missing or invalid.
 */
export function resolveVideoEmbedUrl({
    server = 'server1',
    malId,
    anilistId,
    episodeNumber,
    language = 'sub',
}: ResolveVideoEmbedOptions): string {
    if (isDevToolsActive()) {
        return ''
    }

    const safeEpisode = Math.max(1, Math.floor(Number(episodeNumber) || 1))
    const safeLang = language === 'dub' ? 'dub' : 'sub'

    const hasValidAniId = isValidPositiveIntegerId(anilistId)
    const parsedAniId = hasValidAniId ? Math.floor(Number(anilistId)) : null

    const hasValidMalId = isValidPositiveIntegerId(malId)
    const parsedMalId = hasValidMalId ? Math.floor(Number(malId)) : null

    /*
     * ---------------------------------------------------------
     * SERVER 1: AnimeTVPlus + MAL ID
     * Fixed URL: https://embed.animetvplus.site/home/embed/mal/{malId}/{episodeNumber}
     * ---------------------------------------------------------
     */
    if (server === 'server1') {
        if (!parsedMalId) {
            return ''
        }
        return `${ANIMETVPLUS_EMBED_BASE}/mal/${parsedMalId}/${safeEpisode}`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 2: AnimeTVPlus + AniList ID
     * Fixed URL: https://embed.animetvplus.site/home/embed/anilist/{anilistId}/{episodeNumber}
     * ---------------------------------------------------------
     */
    if (server === 'server2') {
        if (!parsedAniId) {
            return ''
        }
        return `${ANIMETVPLUS_EMBED_BASE}/anilist/${parsedAniId}/${safeEpisode}`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 3: MegaPlay + AniList ID
     * URL: https://megaplay.buzz/stream/ani/{anilistId}/{episodeNumber}/{sub|dub}
     * ---------------------------------------------------------
     */
    if (server === 'server3') {
        if (!parsedAniId) {
            return ''
        }
        return `${MEGAPLAY_STREAM_BASE}/ani/${parsedAniId}/${safeEpisode}/${safeLang}`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 4: MegaPlay + MAL ID
     * URL: https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/{sub|dub}
     * ---------------------------------------------------------
     */
    if (server === 'server4') {
        if (!parsedMalId) {
            return ''
        }
        return `${MEGAPLAY_STREAM_BASE}/mal/${parsedMalId}/${safeEpisode}/${safeLang}`
    }

    /*
     * ---------------------------------------------------------
     * UNKNOWN SERVER
     * ---------------------------------------------------------
     */
    return ''
}

/**
 * Asynchronous video embed URL resolver (kept for backward compatibility and uniform API).
 */
export async function resolveVideoEmbedUrlAsync(
    options: ResolveVideoEmbedOptions,
    _signal?: AbortSignal,
): Promise<string> {
    return resolveVideoEmbedUrl(options)
}
