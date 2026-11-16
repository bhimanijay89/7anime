/**
 * 7Anime — MAL ID Resolver Service
 *
 * Provides verified MyAnimeList ID resolution for AnimeTVPlus (Server 1) and MegaPlay MAL (Server 4).
 *
 * Rules:
 * - AniList ID is primary. First use `anime.malId` / `episode.malId` if present.
 * - If `malId` is missing, retrieves the verified MAL ID through backend lookup.
 * - Caches resolved mappings in-memory.
 * - Never assumes MAL ID equals AniList ID.
 * - Never returns undefined, null, or NaN as a valid ID.
 * - Backend handles any third-party credentials; frontend never exposes client secrets.
 */

const malIdCache = new Map<number, number | null>()

export interface ResolveMalIdOptions {
  anilistId: number | string
  currentMalId?: number | null
  title?: string | null
}

/**
 * Resolves a verified positive integer MAL ID.
 * Returns null if no verified MAL ID is found or available.
 */
export async function resolveMalId({
  anilistId,
  currentMalId,
  title,
}: ResolveMalIdOptions): Promise<number | null> {
  const parsedAniId = Number(anilistId)
  if (!Number.isInteger(parsedAniId) || parsedAniId <= 0) {
    return null
  }

  // 1. If a valid MAL ID is already provided on the metadata, use it
  if (typeof currentMalId === 'number' && Number.isInteger(currentMalId) && currentMalId > 0) {
    malIdCache.set(parsedAniId, currentMalId)
    return currentMalId
  }

  // 2. Check in-memory cache
  if (malIdCache.has(parsedAniId)) {
    return malIdCache.get(parsedAniId) ?? null
  }

  // 3. Query backend verification endpoint
  try {
    const query = title ? `?title=${encodeURIComponent(title)}` : ''
    const response = await fetch(`/api/anime/${parsedAniId}/mal-id${query}`)
    if (!response.ok) {
      return null
    }

    const json = await response.json()
    if (json?.ok && typeof json?.data?.malId === 'number' && json.data.malId > 0) {
      const verifiedId = json.data.malId
      malIdCache.set(parsedAniId, verifiedId)
      return verifiedId
    }

    // Cache null result to prevent repeated hammering
    malIdCache.set(parsedAniId, null)
    return null
  } catch (err) {
    console.warn(`[malResolver] Failed to resolve MAL ID for AniList ID ${parsedAniId}:`, err)
    return null
  }
}

/** Clear cache (for testing) */
export function clearMalIdCache(): void {
  malIdCache.clear()
}
