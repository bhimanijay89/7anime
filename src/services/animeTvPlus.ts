/**
 * 7Anime — AnimeTVPlus Resolver Service
 * Provides API-driven AniList-primary episode availability verification and embed URL generation.
 *
 * Primary API:
 *   GET https://embed.animetvplus.site/api/v1/resolve?anilist={anilistId}&ep={episodeNumber}
 *
 * Caching:
 *   60-second in-memory bounded cache keyed by `${anilistId}:${episodeNumber}`.
 */

export const DEFAULT_ANIMETVPLUS_ORIGIN = 'https://embed.animetvplus.site'
let activeOrigin = DEFAULT_ANIMETVPLUS_ORIGIN

/** Configure origin for testing / mock environments */
export function setAnimeTvPlusOrigin(origin: string) {
  activeOrigin = origin.replace(/\/+$/, '')
}

/** Reset origin to canonical production default */
export function resetAnimeTvPlusOrigin() {
  activeOrigin = DEFAULT_ANIMETVPLUS_ORIGIN
}

export function getAnimeTvPlusOrigin(): string {
  return activeOrigin
}

export interface AnimeTvPlusResolveSuccess {
  ok: true
  title?: string
  mal?: number
  anilist: number
  episode: number
  embed: string
  fullUrl: string
  cached?: boolean
}

export interface AnimeTvPlusResolveFailure {
  ok: false
  error: string
  title?: string
  episode?: number
  available?: number[]
  message: string
}

export type AnimeTvPlusResolveResult = AnimeTvPlusResolveSuccess | AnimeTvPlusResolveFailure

interface CacheEntry {
  result: AnimeTvPlusResolveResult
  expiresAt: number
}

// 60-second TTL as per AnimeTVPlus Cache-Control: public, max-age=60
const CACHE_TTL_MS = 60 * 1000
const MAX_CACHE_SIZE = 200
const cache = new Map<string, CacheEntry>()

/** Clear cache (useful for automated testing) */
export function clearAnimeTvPlusCache(): void {
  cache.clear()
}

/** Get cache entry count (useful for testing) */
export function getAnimeTvPlusCacheSize(): number {
  return cache.size
}

/**
 * Validates that an embed path is a safe relative path belonging to AnimeTVPlus embed route.
 * Rejects external origins, protocol-relative slashes (//evil.com), path traversals, or malformed strings.
 */
export function isSafeEmbedPath(embedPath: unknown): embedPath is string {
  if (typeof embedPath !== 'string' || !embedPath.trim()) {
    return false
  }

  const trimmed = embedPath.trim()

  // Must start with /embed/ and NOT start with //
  if (!trimmed.startsWith('/embed/') || trimmed.startsWith('//')) {
    return false
  }

  // Reject any backslashes, encoded slashes, or path traversal
  if (trimmed.includes('\\') || trimmed.includes('%2f') || trimmed.includes('%2F') || trimmed.includes('..')) {
    return false
  }

  // Allow only safe path characters: /embed/(mal|anilist)/{id}/{episode} with optional query params like ?ep=2
  const safePathRegex = /^\/embed\/[a-zA-Z0-9_\-\.\/]+(?:\?[a-zA-Z0-9_=&-]+)?$/
  return safePathRegex.test(trimmed)
}

export interface ResolveAnimeTvPlusOptions {
  anilistId: number | string
  episodeNumber: number | string
  signal?: AbortSignal
  bypassCache?: boolean
}

/**
 * Resolves verified AnimeTVPlus embed URL via the AniList-primary API.
 */
export async function resolveAnimeTvPlusEmbed({
  anilistId,
  episodeNumber,
  signal,
  bypassCache = false,
}: ResolveAnimeTvPlusOptions): Promise<AnimeTvPlusResolveResult> {
  const parsedAniId = Number(anilistId)
  if (!Number.isInteger(parsedAniId) || parsedAniId <= 0) {
    return {
      ok: false,
      error: 'invalid_anilist_id',
      message: 'A valid positive AniList ID is required for Server 1 (AnimeTVPlus).',
    }
  }

  const parsedEp = Math.max(1, Math.floor(Number(episodeNumber) || 1))
  const cacheKey = `${parsedAniId}:${parsedEp}`

  // Check in-memory cache
  if (!bypassCache) {
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.result,
        ...(cached.result.ok ? { cached: true } : {}),
      }
    }
  }

  const isDefaultOrigin = activeOrigin === DEFAULT_ANIMETVPLUS_ORIGIN
  const isBrowser = typeof window !== 'undefined'
  // In the browser, route through local backend proxy to eliminate CORS blocks; in node/test or custom origin, call directly
  const apiUrl =
    isDefaultOrigin && isBrowser
      ? `/api/animetvplus/resolve?anilist=${parsedAniId}&ep=${parsedEp}`
      : `${activeOrigin}/api/v1/resolve?anilist=${parsedAniId}&ep=${parsedEp}`

  try {
    const timeoutSignal = AbortSignal.timeout(8000)
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: combinedSignal,
    })

    // Handle HTTP non-OK (e.g. 404, 500, 502)
    if (!response.ok) {
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {}

      const failureResult: AnimeTvPlusResolveFailure = {
        ok: false,
        error: errorBody?.error || `http_${response.status}`,
        title: errorBody?.title,
        episode: parsedEp,
        available: Array.isArray(errorBody?.available) ? errorBody.available : undefined,
        message:
          response.status === 404
            ? `Episode ${parsedEp} is not available on Server 1 (AnimeTVPlus).`
            : `Server 1 (AnimeTVPlus) resolver returned HTTP ${response.status}.`,
      }

      // Briefly cache 404 for 10 seconds to prevent rapid request hammering
      if (response.status === 404) {
        setCache(cacheKey, failureResult, 10 * 1000)
      }
      return failureResult
    }

    const contentType = response.headers.get('content-type') || ''

    // Strict validation: reject HTML responses (such as Nginx SPA fallback shells)
    if (contentType.includes('text/html')) {
      return {
        ok: false,
        error: 'html_response',
        message: 'AnimeTVPlus returned HTML instead of JSON. API response could not be validated.',
      }
    }

    if (!contentType.includes('application/json')) {
      // Returned non-JSON format
      return {
        ok: false,
        error: 'non_json_response',
        message: 'Server 1 (AnimeTVPlus) API returned an unexpected response format.',
      }
    }

    const data = await response.json()

    // Validate response payload
    if (!data || typeof data !== 'object') {
      return {
        ok: false,
        error: 'malformed_response',
        message: 'Server 1 (AnimeTVPlus) returned malformed JSON.',
      }
    }

    if (data.ok !== true) {
      const failureResult: AnimeTvPlusResolveFailure = {
        ok: false,
        error: data.error || 'unavailable',
        title: data.title,
        episode: data.episode || parsedEp,
        available: Array.isArray(data.available) ? data.available : undefined,
        message:
          data.error === 'no_episode'
            ? `Episode ${parsedEp} is not available on Server 1 (AnimeTVPlus).`
            : `Server 1 (AnimeTVPlus) is currently unavailable: ${data.error || 'Unknown error'}.`,
      }

      // Cache unavailable result briefly (10 seconds)
      setCache(cacheKey, failureResult, 10 * 1000)
      return failureResult
    }

    // Validate safe embed path
    if (!isSafeEmbedPath(data.embed)) {
      return {
        ok: false,
        error: 'untrusted_embed_path',
        message: 'Server 1 (AnimeTVPlus) returned an invalid or untrusted embed path.',
      }
    }

    const successResult: AnimeTvPlusResolveSuccess = {
      ok: true,
      title: data.title,
      mal: typeof data.mal === 'number' ? data.mal : undefined,
      anilist: typeof data.anilist === 'number' ? data.anilist : parsedAniId,
      episode: typeof data.episode === 'number' ? data.episode : parsedEp,
      embed: data.embed,
      fullUrl: `${activeOrigin}${data.embed}`,
    }

    // Cache successful resolution for 60 seconds
    setCache(cacheKey, successResult, CACHE_TTL_MS)
    return successResult
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        ok: false,
        error: 'aborted',
        message: 'Stream resolution was aborted.',
      }
    }
    if (err.name === 'TimeoutError') {
      return {
        ok: false,
        error: 'timeout',
        message: 'Connection timed out while resolving Server 1 (AnimeTVPlus).',
      }
    }

    const isCorsOrFetchFail = err?.name === 'TypeError' || err?.message === 'Failed to fetch'
    return {
      ok: false,
      error: 'network_error',
      message: isCorsOrFetchFail
        ? 'Provider API unavailable. Unable to reach Server 1 (AnimeTVPlus).'
        : (err?.message || 'Network error while contacting Server 1 (AnimeTVPlus).'),
    }
  }
}

function setCache(key: string, result: AnimeTvPlusResolveResult, ttl: number) {
  // Bounded cache maintenance
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, {
    result,
    expiresAt: Date.now() + ttl,
  })
}
