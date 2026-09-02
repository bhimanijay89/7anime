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
const LIST_CACHE_TTL = 3600 // 1 hour

export async function searchAnime(
    search: string,
    page = 1,
    perPage = 20,
): Promise<AniListAnime[]> {
    const normalizedSearch =
        search.trim()

    if (
        normalizedSearch.length ===
        0
    ) {
        return []
    }

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

    const cacheKey = `anime:search:${normalizedSearch.toLowerCase()}:${safePage}:${safePerPage}`
    const cachedSearch = await cache.get<AniListAnime[]>(cacheKey)
    if (cachedSearch) {
        return cachedSearch
    }

    const data =
        await aniListRequest<{
            Page: {
                media:
                AniListAnime[]
            }
        }>(
            SEARCH_QUERY,
            {
                search:
                    normalizedSearch,
                page: safePage,
                perPage:
                    safePerPage,
            },
        )

    const results = data.Page.media || []
    if (results.length > 0) {
        void cache.set(cacheKey, results, SEARCH_CACHE_TTL)
    }

    return results
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

export async function getAiringSchedule(
    airingAtGreater?: number,
    airingAtLesser?: number,
    page = 1,
    perPage = 50,
): Promise<AniListAiringScheduleItem[]> {
    const safePage = Math.max(1, Math.floor(page))
    const safePerPage = Math.min(100, Math.max(1, Math.floor(perPage)))

    const cacheKey = `anime:schedule:${airingAtGreater || 0}:${airingAtLesser || 0}:${safePage}:${safePerPage}`
    const cached = await cache.get<AniListAiringScheduleItem[]>(cacheKey)
    if (cached) {
        return cached
    }

    const variables: Record<string, unknown> = {
        page: safePage,
        perPage: safePerPage,
    }

    if (typeof airingAtGreater === 'number' && Number.isFinite(airingAtGreater)) {
        variables.airingAtGreater = Math.floor(airingAtGreater)
    }

    if (typeof airingAtLesser === 'number' && Number.isFinite(airingAtLesser)) {
        variables.airingAtLesser = Math.floor(airingAtLesser)
    }

    const data = await aniListRequest<{
        Page: {
            pageInfo?: {
                hasNextPage?: boolean
            }
            airingSchedules: AniListAiringScheduleItem[]
        }
    }>(SCHEDULE_QUERY, variables)

    const results = data.Page?.airingSchedules || []
    if (results.length > 0) {
        void cache.set(cacheKey, results, SCHEDULE_CACHE_TTL)
    }

    return results
}