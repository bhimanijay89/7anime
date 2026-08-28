/* =========================================================
   7ANIME — VIDEO RESOLVER SERVICE
   =========================================================

   SERVER 1 — ani.megaplay.su + AniList ID
     https://ani.megaplay.su/ani/{ANILIST_ID}/{EPISODE}/{sub|dub}

   SERVER 2 — megaplay.buzz + AniList ID
     https://megaplay.buzz/stream/ani/{ANILIST_ID}/{EPISODE}/{sub|dub}

   SERVER 3 — ani.megaplay.su + MAL ID
     https://ani.megaplay.su/mal/{MAL_ID}/{EPISODE}/{sub|dub}

   SERVER 4 — megaplay.buzz + MAL ID
     https://megaplay.buzz/stream/mal/{MAL_ID}/{EPISODE}/{sub|dub}

   ========================================================= */

export interface ResolveVideoEmbedOptions {
    server?: 'server1' | 'server2' | 'server3' | 'server4' | string
    malId?: number | string | null
    anilistId: number | string
    episodeNumber: number
    language?: 'sub' | 'dub'
}

/**
 * Resolve direct video embed URL for 7anime player.
 *
 * No intermediate JSON request is performed.
 *
 * Server selection explicitly determines:
 * - Provider
 * - ID type
 *
 * There is NO automatic MAL ↔ AniList fallback.
 */
import { isDevToolsActive } from '../utils/security'

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

    /*
     * ---------------------------------------------------------
     * SERVER 1
     * ani.megaplay.su + AniList ID
     * ---------------------------------------------------------
     */
    if (server === 'server1') {
        return `https://ani.megaplay.su/ani/${safeAniId}/${safeEpisode}/${safeLang}?color=%237c5cfc`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 2
     * megaplay.buzz + AniList ID
     * ---------------------------------------------------------
     */
    if (server === 'server2') {
        return `https://megaplay.buzz/stream/ani/${safeAniId}/${safeEpisode}/${safeLang}`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 3
     * ani.megaplay.su + MAL ID
     * ---------------------------------------------------------
     */
    if (server === 'server3') {
        if (!hasValidMalId) {
            return ''
        }

        return `https://ani.megaplay.su/mal/${parsedMalId}/${safeEpisode}/${safeLang}?color=%237c5cfc`
    }

    /*
     * ---------------------------------------------------------
     * SERVER 4
     * megaplay.buzz + MAL ID
     * ---------------------------------------------------------
     */
    if (server === 'server4') {
        if (!hasValidMalId) {
            return ''
        }

        return `https://megaplay.buzz/stream/mal/${parsedMalId}/${safeEpisode}/${safeLang}`
    }

    /*
     * ---------------------------------------------------------
     * UNKNOWN SERVER
     * ---------------------------------------------------------
     *
     * Return an empty URL rather than silently selecting
     * another provider or ID type.
     */
    return ''
}