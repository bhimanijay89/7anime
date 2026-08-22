import type {
    Anime,
    Character,
    Episode,
} from '../types/domain'

const ANILIST_ENDPOINT =
    'https://graphql.anilist.co'

const REQUEST_TIMEOUT_MS = 15000

type AniListTitle = {
    romaji?: string | null
    english?: string | null
    native?: string | null
}

type AniListCoverImage = {
    medium?: string | null
    large?: string | null
    extraLarge?: string | null
}

type AniListCharacterEdge = {
    node: {
        id: number

        name: {
            full?: string | null
        }

        image?: {
            medium?: string | null
        }
    }

    role?: string | null

    voiceActors?: Array<{
        name: {
            full?: string | null
        }

        image?: {
            medium?: string | null
        }
    }>
}

type AniListAnime = {
    id: number

    idMal?: number | null

    title: AniListTitle

    coverImage?: AniListCoverImage | null

    bannerImage?: string | null

    description?: string | null

    status?: string | null

    averageScore?: number | null

    episodes?: number | null

    duration?: number | null

    genres?: string[] | null

    format?: string | null

    seasonYear?: number | null

    source?: string | null

    nextAiringEpisode?: {
        episode?: number | null
    } | null

    studios?: {
        nodes?: Array<{
            name: string
        }>
    } | null

    characters?: {
        edges?: AniListCharacterEdge[]
    } | null
}

type AniListAiringMedia =
    Omit<AniListAnime, 'characters'>

type AniListAiringItem = {
    id: number

    airingAt: number

    episode: number

    timeUntilAiring: number

    media: AniListAiringMedia
}

type AniListResponse<T> = {
    data?: T

    errors?: Array<{
        message?: string
        status?: number
    }>
}


/* =========================================================
   ANILIST DETAILS
   ========================================================= */

const ANIME_DETAILS_QUERY = `
    query AnimeDetails($id: Int!) {
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

            description

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

            studios {
                nodes {
                    name
                }
            }

            characters(
                sort: [ROLE, RELEVANCE]
                perPage: 10
            ) {
                edges {
                    node {
                        id

                        name {
                            full
                        }

                        image {
                            medium
                        }
                    }

                    role

                    voiceActors(
                        language: JAPANESE
                    ) {
                        name {
                            full
                        }

                        image {
                            medium
                        }
                    }
                }
            }
        }
    }
`


/* =========================================================
   ANILIST SEARCH
   ========================================================= */

const ANIME_SEARCH_QUERY = `
    query SearchAnime(
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

                description

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

                studios {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`


/* =========================================================
   AIRING / UPCOMING
   ========================================================= */

const AIRING_ANIME_QUERY = `
    query AiringAnime(
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            airingSchedules(
                notYetAired: true
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

                    description

                    status

                    averageScore

                    episodes

                    duration

                    genres

                    format

                    seasonYear

                    source

                    studios {
                        nodes {
                            name
                        }
                    }
                }
            }
        }
    }
`

const AIRING_SCHEDULE_QUERY = `
    query AiringSchedule(
        $airingAtGreater: Int
        $airingAtLesser: Int
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
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
                    description
                    status
                    averageScore
                    episodes
                    duration
                    genres
                    format
                    seasonYear
                    source
                    studios {
                        nodes {
                            name
                        }
                    }
                }
            }
        }
    }
`


/* =========================================================
   FETCH HELPER
   ========================================================= */

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    const controller =
        new AbortController()

    const timeoutId =
        window.setTimeout(
            () => {
                controller.abort()
            },
            REQUEST_TIMEOUT_MS,
        )

    try {
        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal,
            },
        )
    } finally {
        window.clearTimeout(
            timeoutId,
        )
    }
}


/* =========================================================
   ANILIST REQUEST
   ========================================================= */

async function aniListRequest<T>(
    query: string,
    variables: Record<string, unknown>,
): Promise<T> {
    let response: Response

    try {
        response =
            await fetchWithTimeout(
                ANILIST_ENDPOINT,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json',
                    },

                    body:
                        JSON.stringify({
                            query,
                            variables,
                        }),
                },
            )
    } catch (err: unknown) {
        if (
            err instanceof
            DOMException &&
            err.name ===
            'AbortError'
        ) {
            console.error(
                '[AniList API] Request timeout.',
                err,
            )

            throw new Error(
                'AniList request timed out.',
                {
                    cause: err,
                },
            )
        }

        if (
            err instanceof
            TypeError
        ) {
            console.error(
                '[AniList API] Network/CORS failure.',
                err,
            )

            throw new Error(
                'Unable to connect to AniList. The API may be unavailable or blocked.',
                {
                    cause: err,
                },
            )
        }

        console.error(
            '[AniList API] Unexpected fetch error:',
            err,
        )

        throw err
    }

    if (!response.ok) {
        console.error(
            `[AniList API] HTTP ${response.status}: ${response.statusText}`,
        )

        if (
            response.status ===
            403
        ) {
            throw new Error(
                'AniList API is temporarily unavailable (HTTP 403).',
            )
        }

        if (
            response.status ===
            429
        ) {
            throw new Error(
                'AniList API rate limit exceeded (HTTP 429).',
            )
        }

        if (
            response.status >=
            500
        ) {
            throw new Error(
                `AniList server error (HTTP ${response.status}).`,
            )
        }

        throw new Error(
            `AniList request failed (HTTP ${response.status}).`,
        )
    }

    let payload:
        AniListResponse<T>

    try {
        payload =
            (await response.json()) as
            AniListResponse<T>
    } catch (err: unknown) {
        console.error(
            '[AniList API] Invalid JSON response.',
            err,
        )

        throw new Error(
            'AniList returned an invalid response.',
            {
                cause: err,
            },
        )
    }

    if (
        payload.errors &&
        payload.errors.length >
        0
    ) {
        const errorMessage =
            payload.errors[0]
                ?.message ||
            'AniList returned a GraphQL error.'

        console.error(
            '[AniList API] GraphQL error:',
            errorMessage,
        )

        throw new Error(
            errorMessage,
        )
    }

    if (
        !payload.data
    ) {
        console.error(
            '[AniList API] Empty data response.',
        )

        throw new Error(
            'AniList returned no data.',
        )
    }

    return payload.data
}


/* =========================================================
   HELPERS
   ========================================================= */

function cleanTitle(
    title: AniListTitle,
): string {
    return (
        title.english?.trim() ||
        title.romaji?.trim() ||
        title.native?.trim() ||
        'Untitled Anime'
    )
}


function mapStatus(
    status?: string | null,
): Anime['status'] {
    switch (status) {
        case 'FINISHED':
        case 'CANCELLED':
            return 'Completed'

        case 'RELEASING':
        case 'HIATUS':
            return 'Airing'

        case 'NOT_YET_RELEASED':
            return 'Upcoming'

        default:
            return 'Upcoming'
    }
}


function mapType(
    format?: string | null,
): Anime['type'] | undefined {
    if (
        format ===
        'TV'
    ) {
        return 'TV'
    }

    if (
        format ===
        'MOVIE'
    ) {
        return 'Movie'
    }

    return undefined
}


function cleanDescription(
    description?: string | null,
): string | undefined {
    if (!description) {
        return undefined
    }

    return description
        .replace(
            /<br\s*\/?>/gi,
            '\n',
        )
        .replace(
            /<[^>]*>/g,
            '',
        )
        .replace(
            /&amp;/g,
            '&',
        )
        .replace(
            /&quot;/g,
            '"',
        )
        .replace(
            /&#039;/g,
            "'",
        )
        .trim()
}


/* =========================================================
   CHARACTER
   ========================================================= */

function mapCharacter(
    edge: AniListCharacterEdge,
): Character | null {
    const name =
        edge.node.name.full?.trim()

    const avatar =
        edge.node.image?.medium

    if (
        !name ||
        !avatar
    ) {
        return null
    }

    const voiceActor =
        edge.voiceActors?.[0]

    return {
        id:
            String(
                edge.node.id,
            ),

        name,

        role:
            edge.role ===
                'MAIN'
                ? 'Main'
                : 'Supporting',

        avatar,

        ...(voiceActor
            ?.name?.full &&
            voiceActor
                ?.image?.medium
            ? {
                voiceActor: {
                    name:
                        voiceActor
                            .name
                            .full,

                    avatar:
                        voiceActor
                            .image
                            .medium,
                },
            }
            : {}),
    }
}


/* =========================================================
   EPISODE CATALOGUE
   ========================================================= */

/*
 * AniList provides the authoritative information we have
 * for episode availability.
 *
 * For an airing anime:
 *
 *     nextAiringEpisode = 5
 *
 * means episodes 1-4 have already aired.
 *
 * We represent those real episode numbers locally so the
 * player can construct:
 *
 * /stream/ani/{anilist-id}/{episode}/{language}
 *
 * We NEVER invent an episode count when AniList does not
 * provide enough information.
 */

function createEpisodeCatalogue(
    totalEpisodes:
        | number
        | undefined,
    animePoster: string,
    duration?: number,
): Episode[] {
    if (
        !Number.isFinite(
            totalEpisodes,
        ) ||
        !totalEpisodes ||
        totalEpisodes <= 0
    ) {
        return []
    }

    const count =
        Math.min(
            Math.floor(
                totalEpisodes,
            ),
            3000,
        )

    if (
        count <= 0
    ) {
        return []
    }

    return Array.from(
        {
            length: count,
        },
        (_, index) => {
            const number =
                index + 1

            return {
                id:
                    `anilist-episode-${number}`,

                number,

                title:
                    `Episode ${number}`,

                duration:
                    duration ||
                    undefined,

                thumbnail:
                    animePoster ||
                    undefined,
            }
        },
    )
}


/* =========================================================
   EPISODE COUNT RESOLUTION
   ========================================================= */

/*
 * IMPORTANT:
 *
 * AniList's `episodes` field can represent the planned/full
 * episode count for an airing season.
 *
 * For currently airing anime, `nextAiringEpisode.episode`
 * gives us a much better indication of how many episodes
 * are already available.
 *
 * Example:
 *
 *     episodes = 13
 *     nextAiringEpisode = 5
 *
 * Available:
 *
 *     1, 2, 3, 4
 *
 * Therefore:
 *
 *     availableEpisodes = 4
 *
 * We never fall back to arbitrary values such as 12 or 24.
 */

function resolveAvailableEpisodeCount(
    source: AniListAnime,
): number | undefined {
    const rawEpisodes =
        source.episodes

    const nextAiringEpisode =
        source.nextAiringEpisode
            ?.episode

    /*
     * Airing anime:
     *
     * If AniList tells us the next episode,
     * everything before it has already aired.
     */
    if (
        typeof nextAiringEpisode ===
        'number' &&
        Number.isFinite(
            nextAiringEpisode,
        )
    ) {
        return Math.max(
            0,
            Math.floor(
                nextAiringEpisode -
                1,
            ),
        )
    }

    /*
     * Upcoming anime:
     *
     * No episode has aired yet.
     */
    if (
        source.status ===
        'NOT_YET_RELEASED'
    ) {
        return 0
    }

    /*
     * Completed anime:
     *
     * AniList's episode count is the
     * authoritative completed count.
     */
    if (
        source.status ===
        'FINISHED' ||
        source.status ===
        'CANCELLED'
    ) {
        if (
            typeof rawEpisodes ===
            'number' &&
            Number.isFinite(
                rawEpisodes,
            ) &&
            rawEpisodes > 0
        ) {
            return Math.floor(
                rawEpisodes,
            )
        }

        return undefined
    }

    /*
     * Movies / specials:
     *
     * The existing application treats these
     * as a single playable item.
     */
    if (
        source.format ===
        'MOVIE' ||
        source.format ===
        'SPECIAL'
    ) {
        return 1
    }

    /*
     * For an airing anime without a reliable
     * next-airing episode, do NOT guess.
     */
    if (
        source.status ===
        'RELEASING'
    ) {
        return undefined
    }

    /*
     * For any unknown status, only use a positive
     * AniList episode count when it is safe to do so.
     */
    if (
        typeof rawEpisodes ===
        'number' &&
        Number.isFinite(
            rawEpisodes,
        ) &&
        rawEpisodes > 0
    ) {
        return Math.floor(
            rawEpisodes,
        )
    }

    return undefined
}


/* =========================================================
   MAP ANILIST ANIME
   ========================================================= */

export function mapAniListAnime(
    source: AniListAnime,
): Anime {
    const poster =
        source.coverImage
            ?.extraLarge ||
        source.coverImage
            ?.large ||
        source.coverImage
            ?.medium ||
        ''

    const characters =
        source.characters
            ?.edges
            ?.map(
                mapCharacter,
            )
            .filter(
                (
                    character,
                ): character is Character =>
                    character !== null,
            )

    const studio =
        source.studios
            ?.nodes?.[0]
            ?.name

    const totalEpisodes =
        resolveAvailableEpisodeCount(
            source,
        )

    const episodesList =
        createEpisodeCatalogue(
            totalEpisodes,
            poster,
            source.duration ||
            undefined,
        )

    return {
        id:
            String(
                source.id,
            ),

        title:
            cleanTitle(
                source.title,
            ),

        poster,

        cover:
            source.bannerImage ||
            poster,

        banner:
            source.bannerImage ||
            poster,

        malId:
            source.idMal ||
            undefined,

        episode:
            totalEpisodes !==
                undefined &&
                totalEpisodes > 0
                ? `EP ${totalEpisodes}`
                : undefined,

        status:
            mapStatus(
                source.status,
            ),

        rating:
            source.averageScore
                ? source.averageScore /
                10
                : undefined,

        genres:
            source.genres ||
            undefined,

        type:
            mapType(
                source.format,
            ),

        year:
            source.seasonYear ||
            undefined,

        synopsis:
            cleanDescription(
                source.description,
            ),

        studio,

        source:
            source.source ||
            undefined,

        duration:
            source.duration
                ? `${source.duration}m per ep`
                : undefined,

        /*
         * Sub count is based on the available
         * episode count we resolved from AniList.
         */
        sub:
            totalEpisodes !==
                undefined &&
                totalEpisodes > 0
                ? totalEpisodes
                : undefined,

        /*
         * We do NOT fabricate a dub count.
         *
         * Actual dub availability will be supplied
         * later by the streaming/provider layer.
         */
        dub:
            undefined,

        totalEpisodes,

        episodesList:
            episodesList.length >
                0
                ? episodesList
                : undefined,

        ...(characters &&
            characters.length > 0
            ? {
                characters,
            }
            : {}),
    }
}


/* =========================================================
   GET ANIME
   ========================================================= */

export async function getAnimeById(
    id: number,
): Promise<Anime> {
    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new Error(
            'Invalid AniList anime ID.',
        )
    }

    const data =
        await aniListRequest<{
            Media: AniListAnime
        }>(
            ANIME_DETAILS_QUERY,
            {
                id,
            },
        )

    if (
        !data.Media
    ) {
        throw new Error(
            'Anime not found on AniList.',
        )
    }

    return mapAniListAnime(
        data.Media,
    )
}


/* =========================================================
   SEARCH
   ========================================================= */

export async function searchAnime(
    search: string,
    page = 1,
    perPage = 12,
): Promise<Anime[]> {
    const normalizedSearch =
        search.trim()

    if (
        !normalizedSearch
    ) {
        return []
    }

    const safePage =
        Math.max(
            1,
            Math.floor(
                page,
            ),
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

    const data =
        await aniListRequest<{
            Page: {
                media: AniListAnime[]
            }
        }>(
            ANIME_SEARCH_QUERY,
            {
                search:
                    normalizedSearch,

                page:
                    safePage,

                perPage:
                    safePerPage,
            },
        )

    return (
        data.Page.media ||
        []
    ).map(
        mapAniListAnime,
    )
}


/* =========================================================
   UPCOMING
   ========================================================= */

export type UpcomingAnimeItem = {
    anime: Anime

    episode: number

    airingAt: number

    timeUntilAiring: number
}


export async function getUpcomingAnime(
    page = 1,
    perPage = 20,
): Promise<
    UpcomingAnimeItem[]
> {
    const safePage =
        Math.max(
            1,
            Math.floor(
                page,
            ),
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

    const data =
        await aniListRequest<{
            Page: {
                airingSchedules:
                AniListAiringItem[]
            }
        }>(
            AIRING_ANIME_QUERY,
            {
                page:
                    safePage,

                perPage:
                    safePerPage,
            },
        )

    return (
        data.Page
            .airingSchedules ||
        []
    ).map(
        item => ({
            anime:
                mapAniListAnime(
                    item.media,
                ),

            episode:
                item.episode,

            airingAt:
                item.airingAt,

            timeUntilAiring:
                item.timeUntilAiring,
        }),
    )
}

/* =========================================================
   AIRING SCHEDULE
   ========================================================= */

const BACKEND_URL =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    'http://localhost:3001'

export interface AiringScheduleEntry {
    id: string
    airingAt: number // Unix timestamp in seconds
    episode: number
    timeUntilAiring: number
    anime: Anime
}

export async function getAiringSchedule(
    airingAtGreater?: number,
    airingAtLesser?: number,
    page = 1,
    perPage = 50,
): Promise<AiringScheduleEntry[]> {
    const params = new URLSearchParams()
    if (typeof airingAtGreater === 'number' && Number.isFinite(airingAtGreater)) {
        params.set('start', String(Math.floor(airingAtGreater)))
    }
    if (typeof airingAtLesser === 'number' && Number.isFinite(airingAtLesser)) {
        params.set('end', String(Math.floor(airingAtLesser)))
    }
    params.set('page', String(Math.max(1, Math.floor(page))))
    params.set('perPage', String(Math.min(100, Math.max(1, Math.floor(perPage)))))

    try {
        const response = await fetch(`${BACKEND_URL}/api/anime/schedule?${params.toString()}`)
        if (response.ok) {
            const result = await response.json()
            if (result.ok && Array.isArray(result.data?.schedules)) {
                return result.data.schedules.map((item: AniListAiringItem) => ({
                    id: String(item.id),
                    airingAt: item.airingAt,
                    episode: item.episode,
                    timeUntilAiring: item.timeUntilAiring,
                    anime: mapAniListAnime(item.media),
                }))
            }
        }
    } catch (err) {
        console.warn('[7anime] Backend schedule endpoint request failed, using direct AniList query:', err)
    }

    const data = await aniListRequest<{
        Page: {
            airingSchedules: AniListAiringItem[]
        }
    }>(
        AIRING_SCHEDULE_QUERY,
        {
            airingAtGreater: airingAtGreater ? Math.floor(airingAtGreater) : undefined,
            airingAtLesser: airingAtLesser ? Math.floor(airingAtLesser) : undefined,
            page: Math.max(1, Math.floor(page)),
            perPage: Math.min(100, Math.max(1, Math.floor(perPage))),
        },
    )

    return (data.Page?.airingSchedules || []).map(item => ({
        id: String(item.id),
        airingAt: item.airingAt,
        episode: item.episode,
        timeUntilAiring: item.timeUntilAiring,
        anime: mapAniListAnime(item.media),
    }))
}


/* =========================================================
   TRENDING ANIME
   ========================================================= */

const TRENDING_ANIME_QUERY = `
    query TrendingAnime(
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

                description

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

                studios {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`


export async function getTrendingAnime(
    page = 1,
    perPage = 20,
): Promise<Anime[]> {
    const safePage =
        Math.max(
            1,
            Math.floor(
                page,
            ),
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

    const data =
        await aniListRequest<{
            Page: {
                media: AniListAnime[]
            }
        }>(
            TRENDING_ANIME_QUERY,
            {
                page:
                    safePage,

                perPage:
                    safePerPage,
            },
        )

    return (
        data.Page.media ||
        []
    ).map(
        mapAniListAnime,
    )
}


/* =========================================================
   POPULAR / TOP RATED ANIME
   ========================================================= */

const POPULAR_ANIME_QUERY = `
    query PopularAnime(
        $page: Int
        $perPage: Int
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            media(
                type: ANIME
                sort: SCORE_DESC
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

                description

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

                studios {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`


export async function getPopularAnime(
    page = 1,
    perPage = 20,
): Promise<Anime[]> {
    const safePage =
        Math.max(
            1,
            Math.floor(
                page,
            ),
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

    const data =
        await aniListRequest<{
            Page: {
                media: AniListAnime[]
            }
        }>(
            POPULAR_ANIME_QUERY,
            {
                page:
                    safePage,

                perPage:
                    safePerPage,
            },
        )

    return (
        data.Page.media ||
        []
    ).map(
        mapAniListAnime,
    )
}


/* =========================================================
   MEGAPLAY EMBED
   ========================================================= */

/*
 * MegaPlay:
 *
 * /stream/ani/{anilist-id}/{episode}/{language}
 *
 * The URL is intended to be embedded in an iframe.
 */

export function getMegaPlayEmbedUrl(
    animeId: string | number,
    episodeNumber: number,
    language:
        | 'sub'
        | 'dub' = 'sub',
): string {
    const safeAnimeId =
        encodeURIComponent(
            String(
                animeId,
            ),
        )

    const safeEpisode =
        Math.max(
            1,
            Math.floor(
                episodeNumber,
            ),
        )

    return (
        `https://megaplay.buzz/stream/ani/` +
        `${safeAnimeId}/` +
        `${safeEpisode}/` +
        `${language}`
    )
}

export function getAnimeStreamEmbedUrl(
    server: string,
    animeId: string | number,
    episodeNumber: number,
    language:
        | 'sub'
        | 'dub' = 'sub',
): string {
    void server
    return getMegaPlayEmbedUrl(animeId, episodeNumber, language)
}