import type {
    AniListAnime,
    AniListAiringScheduleItem,
    AniListResponse,
} from '../types.js'

import {
    cache,
    ANIME_CACHE_TTL,
    getAnimeCacheKey,
} from '../redis/cache.js'

const ANILIST_API_URL =
    'https://graphql.anilist.co'

const REQUEST_TIMEOUT_MS = 10_000

const ANILIST_QUERY = `
    query (
        $id: Int
    ) {
        Media(
            id: $id
            type: ANIME
        ) {
            id
            idMal

            title {
                romaji
                english
                native
            }

            coverImage {
                medium
                large
                extraLarge
            }

            bannerImage

            description(
                asHtml: false
            )

            status
            averageScore
            episodes
            duration

            genres

            format
            seasonYear
            source

            nextAiringEpisode {
                episode
            }

            studios(
                isMain: true
            ) {
                nodes {
                    name
                }
            }
        }
    }
`

const SEARCH_QUERY = `
    query (
        $search: String
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            media(
                search: $search
                type: ANIME
                sort: SEARCH_MATCH
            ) {
                id
                idMal

                title {
                    romaji
                    english
                    native
                }

                coverImage {
                    medium
                    large
                    extraLarge
                }

                bannerImage

                description(
                    asHtml: false
                )

                status
                averageScore
                episodes
                duration

                genres

                format
                seasonYear
                source

                nextAiringEpisode {
                    episode
                }

                studios(
                    isMain: true
                ) {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`

const TRENDING_QUERY = `
    query (
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            media(
                type: ANIME
                sort: TRENDING_DESC
            ) {
                id
                idMal

                title {
                    romaji
                    english
                    native
                }

                coverImage {
                    medium
                    large
                    extraLarge
                }

                bannerImage

                description(
                    asHtml: false
                )

                status
                averageScore
                episodes
                duration

                genres

                format
                seasonYear
                source

                nextAiringEpisode {
                    episode
                }

                studios(
                    isMain: true
                ) {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`

const POPULAR_QUERY = `
    query (
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            media(
                type: ANIME
                sort: POPULARITY_DESC
            ) {
                id
                idMal

                title {
                    romaji
                    english
                    native
                }

                coverImage {
                    medium
                    large
                    extraLarge
                }

                bannerImage

                description(
                    asHtml: false
                )

                status
                averageScore
                episodes
                duration

                genres

                format
                seasonYear
                source

                nextAiringEpisode {
                    episode
                }

                studios(
                    isMain: true
                ) {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`

const UPCOMING_QUERY = `
    query (
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            media(
                type: ANIME
                status: NOT_YET_RELEASED
                sort: POPULARITY_DESC
            ) {
                id
                idMal

                title {
                    romaji
                    english
                    native
                }

                coverImage {
                    medium
                    large
                    extraLarge
                }

                bannerImage

                description(
                    asHtml: false
                )

                status
                averageScore
                episodes
                duration

                genres

                format
                seasonYear
                source

                nextAiringEpisode {
                    episode
                }

                studios(
                    isMain: true
                ) {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`

class AniListError extends Error {
    status: number

    code: string

    constructor(
        message: string,
        status: number,
        code: string,
    ) {
        super(message)

        this.name =
            'AniListError'

        this.status = status
        this.code = code
    }
}

async function aniListRequest<T>(
    query: string,
    variables: Record<
        string,
        unknown
    > = {},
): Promise<T> {
    const controller =
        new AbortController()

    const timeout = setTimeout(
        () => {
            controller.abort()
        },
        REQUEST_TIMEOUT_MS,
    )

    try {
        const response =
            await fetch(
                ANILIST_API_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',
                        Accept:
                            'application/json',
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    },

                    body: JSON.stringify({
                        query,
                        variables,
                    }),

                    signal:
                        controller.signal,
                },
            )

        const rawText =
            await response.text()

        let payload:
            AniListResponse<T>

        try {
            payload =
                JSON.parse(
                    rawText,
                ) as AniListResponse<T>
        } catch {
            throw new AniListError(
                'AniList returned an invalid response.',
                response.status,
                'INVALID_RESPONSE',
            )
        }

        if (
            !response.ok
        ) {
            const message =
                payload.errors
                    ?.map(
                        (error) =>
                            error.message,
                    )
                    .filter(
                        Boolean,
                    )
                    .join('; ') ||
                `AniList request failed with HTTP ${response.status}.`

            let code =
                'HTTP_ERROR'

            if (
                response.status ===
                403
            ) {
                code =
                    'API_FORBIDDEN'
            } else if (
                response.status ===
                429
            ) {
                code =
                    'RATE_LIMITED'
            } else if (
                response.status >=
                500
            ) {
                code =
                    'API_UNAVAILABLE'
            }

            throw new AniListError(
                message,
                response.status,
                code,
            )
        }

        if (
            payload.errors &&
            payload.errors.length > 0
        ) {
            const message =
                payload.errors
                    .map(
                        (error) =>
                            error.message,
                    )
                    .filter(
                        Boolean,
                    )
                    .join('; ')

            throw new AniListError(
                message ||
                'AniList returned GraphQL errors.',
                200,
                'GRAPHQL_ERROR',
            )
        }

        if (
            payload.data ===
            undefined
        ) {
            throw new AniListError(
                'AniList returned no data.',
                200,
                'EMPTY_RESPONSE',
            )
        }

        return payload.data
    } catch (error) {
        if (
            error instanceof
            AniListError
        ) {
            throw error
        }

        if (
            error instanceof
            Error &&
            error.name ===
            'AbortError'
        ) {
            throw new AniListError(
                'AniList request timed out.',
                408,
                'TIMEOUT',
            )
        }

        const message =
            error instanceof
                Error
                ? error.message
                : 'Unknown AniList network error.'

        throw new AniListError(
            `Unable to reach AniList: ${message}`,
            0,
            'NETWORK_ERROR',
        )
    } finally {
        clearTimeout(
            timeout,
        )
    }
}

const pendingAnimeRequests = new Map<number, Promise<AniListAnime>>()

export async function getAnimeById(
    anilistId: number,
): Promise<AniListAnime> {
    if (
        !Number.isInteger(
            anilistId,
        ) ||
        anilistId <= 0
    ) {
        throw new AniListError(
            'Invalid AniList anime ID.',
            400,
            'INVALID_ID',
        )
    }

    const cacheKey = getAnimeCacheKey(anilistId)

    // 1. Check Redis Cache (Cache-Aside pattern)
    const cachedAnime = await cache.get<AniListAnime>(cacheKey)
    if (cachedAnime) {
        (cachedAnime as unknown as Record<string, unknown>)._cached = true
        return cachedAnime
    }

    // 2. Check in-flight requests map (Request Deduplication)
    const existingPromise = pendingAnimeRequests.get(anilistId)
    if (existingPromise) {
        return existingPromise
    }

    // 3. Create fresh AniList fetch promise & store in Redis
    const fetchPromise = (async () => {
        try {
            const data =
                await aniListRequest<{
                    Media:
                    | AniListAnime
                    | null
                }>(
                    ANILIST_QUERY,
                    {
                        id: anilistId,
                    },
                )

            if (!data.Media) {
                throw new AniListError(
                    `Anime with AniList ID ${anilistId} was not found.`,
                    404,
                    'NOT_FOUND',
                )
            }

            // Save to Redis cache asynchronously with 24-hour TTL
            void cache.set(cacheKey, data.Media, ANIME_CACHE_TTL)

            return data.Media
        } finally {
            pendingAnimeRequests.delete(anilistId)
        }
    })()

    pendingAnimeRequests.set(anilistId, fetchPromise)
    return fetchPromise
}

export async function invalidateAnimeCache(anilistId: number): Promise<boolean> {
    const cacheKey = getAnimeCacheKey(anilistId)
    return cache.delete(cacheKey)
}

const SEARCH_CACHE_TTL = 1800 // 30 minutes
const SEARCH_STALE_CACHE_TTL = 86400 // 24 hours
const LIST_CACHE_TTL = 3600 // 1 hour

const pendingSearchRequests = new Map<string, Promise<AniListAnime[]>>()

export async function searchAnime(
    search: string,
    page = 1,
    perPage = 20,
): Promise<AniListAnime[]> {
    const normalizedSearch = search.trim()

    if (normalizedSearch.length === 0) {
        return []
    }

    const safePage = Math.max(1, Math.floor(page))
    const safePerPage = Math.min(50, Math.max(1, Math.floor(perPage)))

    const lowerQuery = normalizedSearch.toLowerCase()
    const freshCacheKey = `anime:search:${lowerQuery}:${safePage}:${safePerPage}`
    const staleCacheKey = `anime:search:stale:${lowerQuery}:${safePage}:${safePerPage}`
    const requestKey = `${lowerQuery}:${safePage}:${safePerPage}`

    // 1. Check Fresh Redis Cache
    const freshCached = await cache.get<AniListAnime[]>(freshCacheKey)
    if (freshCached && freshCached.length > 0) {
        console.log(`[7anime-api] SEARCH_CACHE_FRESH_HIT key="${freshCacheKey}" items=${freshCached.length}`)
        return freshCached
    }

    console.log(`[7anime-api] SEARCH_CACHE_MISS key="${freshCacheKey}"`)

    // 2. Check In-Flight Request Deduplication Map
    const existingPromise = pendingSearchRequests.get(requestKey)
    if (existingPromise) {
        console.log(`[7anime-api] SEARCH_INFLIGHT_JOIN key="${requestKey}"`)
        return existingPromise
    }

    // 3. Create fresh AniList fetch promise with single retry & stale fallback
    console.log(`[7anime-api] SEARCH_INFLIGHT_START key="${requestKey}"`)
    const fetchPromise = (async () => {
        try {
            console.log(`[7anime-api] SEARCH_UPSTREAM_START key="${requestKey}"`)
            let data: { Page: { media: AniListAnime[] } } | null = null
            let lastError: unknown = null

            // Attempt 1: Upstream AniList request
            try {
                data = await aniListRequest<{
                    Page: {
                        media: AniListAnime[]
                    }
                }>(SEARCH_QUERY, {
                    search: normalizedSearch,
                    page: safePage,
                    perPage: safePerPage,
                })
            } catch (err) {
                lastError = err
                console.warn(
                    `[7anime-api] SEARCH_UPSTREAM_RETRY key="${requestKey}" error=`,
                    err instanceof Error ? err.message : err,
                )

                // Single bounded retry with short delay
                await new Promise((resolve) => setTimeout(resolve, 500))

                try {
                    data = await aniListRequest<{
                        Page: {
                            media: AniListAnime[]
                        }
                    }>(SEARCH_QUERY, {
                        search: normalizedSearch,
                        page: safePage,
                        perPage: safePerPage,
                    })
                    lastError = null
                } catch (retryErr) {
                    lastError = retryErr
                    console.error(
                        `[7anime-api] SEARCH_UPSTREAM_FAILURE key="${requestKey}" error=`,
                        retryErr instanceof Error ? retryErr.message : retryErr,
                    )
                }
            }

            const results = data?.Page?.media || []

            if (data && !lastError && results.length > 0) {
                console.log(`[7anime-api] SEARCH_UPSTREAM_SUCCESS key="${requestKey}" items=${results.length}`)
                // Save payload to Fresh Cache (30m) and Stale Fallback Cache (24h)
                void cache.set(freshCacheKey, results, SEARCH_CACHE_TTL)
                void cache.set(staleCacheKey, results, SEARCH_STALE_CACHE_TTL)
                return results
            }

            // Upstream failed or returned empty: Attempt Stale Fallback Cache
            console.log(`[7anime-api] Attempting stale search fallback for key="${staleCacheKey}"`)
            const staleCached = await cache.get<AniListAnime[]>(staleCacheKey)
            if (staleCached && staleCached.length > 0) {
                console.log(`[7anime-api] SEARCH_STALE_HIT key="${staleCacheKey}" items=${staleCached.length}`)
                return staleCached
            }

            console.error(`[7anime-api] SEARCH_STALE_MISS key="${staleCacheKey}" - No fallback available`)
            if (lastError instanceof Error) {
                throw lastError
            }

            throw new AniListError(
                'Unable to search anime from AniList and no stale fallback available.',
                502,
                'SERVICE_UNAVAILABLE',
            )
        } finally {
            pendingSearchRequests.delete(requestKey)
            console.log(`[7anime-api] SEARCH_INFLIGHT_COMPLETE key="${requestKey}"`)
        }
    })()

    pendingSearchRequests.set(requestKey, fetchPromise)
    return fetchPromise
}

export async function getTrendingAnime(
    page = 1,
    perPage = 20,
): Promise<AniListAnime[]> {
    return getPageAnime(
        TRENDING_QUERY,
        'trending',
        page,
        perPage,
    )
}

export async function getPopularAnime(
    page = 1,
    perPage = 20,
): Promise<AniListAnime[]> {
    return getPageAnime(
        POPULAR_QUERY,
        'popular',
        page,
        perPage,
    )
}

export async function getUpcomingAnime(
    page = 1,
    perPage = 20,
): Promise<AniListAnime[]> {
    return getPageAnime(
        UPCOMING_QUERY,
        'upcoming',
        page,
        perPage,
    )
}

async function getPageAnime(
    query: string,
    categoryKey: string,
    page: number,
    perPage: number,
): Promise<AniListAnime[]> {
    const safePage =
        Math.max(
            1,
            Math.floor(page),
        )

    const safePerPage =
        Math.min(
            50,
            Math.max(
                1,
                Math.floor(
                    perPage,
                ),
            ),
        )

    const cacheKey = `anime:list:${categoryKey}:${safePage}:${safePerPage}`
    const cachedList = await cache.get<AniListAnime[]>(cacheKey)
    if (cachedList) {
        return cachedList
    }

    const data =
        await aniListRequest<{
            Page: {
                media:
                AniListAnime[]
            }
        }>(
            query,
            {
                page: safePage,
                perPage:
                    safePerPage,
            },
        )

    const results = data.Page.media || []
    if (results.length > 0) {
        void cache.set(cacheKey, results, LIST_CACHE_TTL)
    }

    return results
}

const SCHEDULE_QUERY = `
    query (
        $airingAtGreater: Int
        $airingAtLesser: Int
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            pageInfo {
                hasNextPage
                total
            }
            airingSchedules(
                airingAt_greater: $airingAtGreater
                airingAt_lesser: $airingAtLesser
                sort: TIME
            ) {
                id
                airingAt
                episode
                timeUntilAiring
                media {
                    id
                    idMal
                    title {
                        romaji
                        english
                        native
                    }
                    coverImage {
                        medium
                        large
                        extraLarge
                    }
                    bannerImage
                    description(asHtml: false)
                    status
                    averageScore
                    episodes
                    duration
                    genres
                    format
                    seasonYear
                    source
                    studios(isMain: true) {
                        nodes {
                            name
                        }
                    }
                }
            }
        }
    }
`

const SCHEDULE_CACHE_TTL = 900 // 15 minutes
const SCHEDULE_STALE_CACHE_TTL = 86400 // 24 hours

const pendingScheduleRequests = new Map<string, Promise<AniListAiringScheduleItem[]>>()

export async function getAiringSchedule(
    airingAtGreater?: number,
    airingAtLesser?: number,
    page = 1,
    perPage = 50,
): Promise<AniListAiringScheduleItem[]> {
    const safePage = Math.max(1, Math.floor(page))
    const safePerPage = Math.min(100, Math.max(1, Math.floor(perPage)))

    if (typeof airingAtGreater !== 'number' || !Number.isFinite(airingAtGreater)) {
        const now = Math.floor(Date.now() / 1000)
        airingAtGreater = now - (3 * 86400)
    }

    if (typeof airingAtLesser !== 'number' || !Number.isFinite(airingAtLesser)) {
        const now = Math.floor(Date.now() / 1000)
        airingAtLesser = now + (7 * 86400)
    }

    const freshCacheKey = `anime:schedule:${airingAtGreater || 0}:${airingAtLesser || 0}:${safePage}:${safePerPage}`
    const staleCacheKey = `anime:schedule:stale:${airingAtGreater || 0}:${airingAtLesser || 0}:${safePage}:${safePerPage}`
    const requestKey = `${airingAtGreater || 0}:${airingAtLesser || 0}:${safePage}:${safePerPage}`

    // 1. Check Fresh Redis Cache
    const freshCached = await cache.get<AniListAiringScheduleItem[]>(freshCacheKey)
    if (freshCached && freshCached.length > 0) {
        console.log(`[7anime-api] SCHEDULE_CACHE_FRESH_HIT key="${freshCacheKey}" items=${freshCached.length}`)
        return freshCached
    }

    console.log(`[7anime-api] SCHEDULE_CACHE_MISS key="${freshCacheKey}"`)

    // 2. Check In-Flight Request Deduplication Map
    const existingPromise = pendingScheduleRequests.get(requestKey)
    if (existingPromise) {
        console.log(`[7anime-api] SCHEDULE_INFLIGHT_JOIN key="${requestKey}"`)
        return existingPromise
    }

    // 3. Create fresh AniList fetch promise with single retry & stale fallback
    console.log(`[7anime-api] SCHEDULE_INFLIGHT_START key="${requestKey}"`)
    const fetchPromise = (async () => {
        const variables: Record<string, unknown> = {
            page: safePage,
            perPage: safePerPage,
            airingAtGreater: Math.floor(airingAtGreater!),
            airingAtLesser: Math.floor(airingAtLesser!),
        }

        try {
            console.log(`[7anime-api] SCHEDULE_UPSTREAM_START key="${requestKey}"`)
            let data: { Page: { airingSchedules: AniListAiringScheduleItem[] } } | null = null
            let lastError: unknown = null

            // Attempt 1: Upstream AniList request
            try {
                data = await aniListRequest<{
                    Page: {
                        pageInfo?: { hasNextPage?: boolean }
                        airingSchedules: AniListAiringScheduleItem[]
                    }
                }>(SCHEDULE_QUERY, variables)
            } catch (err) {
                lastError = err
                console.warn(
                    `[7anime-api] SCHEDULE_UPSTREAM_RETRY key="${requestKey}" error=`,
                    err instanceof Error ? err.message : err,
                )

                // Single bounded retry with short delay
                await new Promise((resolve) => setTimeout(resolve, 500))

                try {
                    data = await aniListRequest<{
                        Page: {
                            pageInfo?: { hasNextPage?: boolean }
                            airingSchedules: AniListAiringScheduleItem[]
                        }
                    }>(SCHEDULE_QUERY, variables)
                    lastError = null
                } catch (retryErr) {
                    lastError = retryErr
                    console.error(
                        `[7anime-api] SCHEDULE_UPSTREAM_FAILURE key="${requestKey}" error=`,
                        retryErr instanceof Error ? retryErr.message : retryErr,
                    )
                }
            }

            const results = data?.Page?.airingSchedules || []

            if (data && !lastError && results.length > 0) {
                console.log(`[7anime-api] SCHEDULE_UPSTREAM_SUCCESS key="${requestKey}" items=${results.length}`)
                // Save payload to Fresh Cache (15m) and Stale Fallback Cache (24h)
                void cache.set(freshCacheKey, results, SCHEDULE_CACHE_TTL)
                void cache.set(staleCacheKey, results, SCHEDULE_STALE_CACHE_TTL)
                return results
            }

            // Upstream failed or returned empty: Attempt Stale Fallback Cache
            console.log(`[7anime-api] Attempting stale schedule fallback for key="${staleCacheKey}"`)
            const staleCached = await cache.get<AniListAiringScheduleItem[]>(staleCacheKey)
            if (staleCached && staleCached.length > 0) {
                console.log(`[7anime-api] SCHEDULE_STALE_HIT key="${staleCacheKey}" items=${staleCached.length}`)
                return staleCached
            }

            console.error(`[7anime-api] SCHEDULE_STALE_MISS key="${staleCacheKey}" - No fallback available`)
            if (lastError instanceof Error) {
                throw lastError
            }

            throw new AniListError(
                'Unable to fetch schedule from AniList and no stale fallback available.',
                502,
                'SERVICE_UNAVAILABLE',
            )
        } finally {
            pendingScheduleRequests.delete(requestKey)
            console.log(`[7anime-api] SCHEDULE_INFLIGHT_COMPLETE key="${requestKey}"`)
        }
    })()

    pendingScheduleRequests.set(requestKey, fetchPromise)
    return fetchPromise
}