import type {
    Anime,
    Character,
    Episode,
} from '../types/domain'

const ANILIST_ENDPOINT =
    'https://graphql.anilist.co'

const JIKAN_ENDPOINT =
    'https://api.jikan.moe/v4'

const REQUEST_TIMEOUT_MS = 12_000

const JIKAN_PAGE_SIZE = 100

const JIKAN_REQUEST_DELAY_MS = 400

const JIKAN_MAX_RETRIES = 3

type AniListTitle = {
    romaji?: string | null
    english?: string | null
    native?: string | null
}

type AniListCoverImage = {
    large?: string | null
    extraLarge?: string | null
    medium?: string | null
}

type AniListCharacterNode = {
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

    studios?: {
        nodes?: Array<{
            name: string
        }>
    } | null

    source?: string | null

    characters?: {
        edges?: AniListCharacterNode[]
    } | null
}

type AniListResponse<T> = {
    data?: T

    errors?: Array<{
        message?: string
    }>
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

type JikanEpisode = {
    mal_id: number

    title?: string | null

    title_japanese?: string | null

    title_romanji?: string | null

    aired?: string | null

    score?: number | null

    filler?: boolean

    recap?: boolean
}

type JikanEpisodesResponse = {
    data?: JikanEpisode[]

    pagination?: {
        last_visible_page?: number

        has_next_page?: boolean

        current_page?: number

        items?: {
            count?: number

            total?: number

            per_page?: number
        }
    }
}

/*
|--------------------------------------------------------------------------
| AniList Anime Details
|--------------------------------------------------------------------------
*/

const ANIME_DETAILS_QUERY = `
    query AnimeDetails($id: Int) {
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

/*
|--------------------------------------------------------------------------
| AniList Search
|--------------------------------------------------------------------------
*/

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

                studios {
                    nodes {
                        name
                    }
                }
            }
        }
    }
`

/*
|--------------------------------------------------------------------------
| AniList Airing / Upcoming
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Generic fetch helper
|--------------------------------------------------------------------------
*/

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    const controller =
        new AbortController()

    const timeoutId =
        window.setTimeout(
            () =>
                controller.abort(),
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

/*
|--------------------------------------------------------------------------
| AniList Request
|--------------------------------------------------------------------------
*/

async function aniListRequest<T>(
    query: string,
    variables: Record<string, unknown>,
): Promise<T> {
    const response =
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

                body: JSON.stringify({
                    query,
                    variables,
                }),
            },
        )

    if (!response.ok) {
        throw new Error(
            `AniList request failed: ${response.status}`,
        )
    }

    const payload =
        (await response.json()) as
        AniListResponse<T>

    if (payload.errors?.length) {
        throw new Error(
            payload.errors[0]?.message ||
            'AniList returned an error.',
        )
    }

    if (!payload.data) {
        throw new Error(
            'AniList returned an empty response.',
        )
    }

    return payload.data
}

/*
|--------------------------------------------------------------------------
| Jikan Request
|--------------------------------------------------------------------------
*/

async function jikanRequest<T>(
    path: string,
    retry = 0,
): Promise<T> {
    try {
        const response =
            await fetchWithTimeout(
                `${JIKAN_ENDPOINT}${path}`,
                {
                    method: 'GET',

                    headers: {
                        Accept:
                            'application/json',
                    },
                },
            )

        if (
            response.status === 429 ||
            response.status === 503
        ) {
            if (
                retry <
                JIKAN_MAX_RETRIES
            ) {
                const wait =
                    1000 *
                    Math.pow(
                        2,
                        retry,
                    )

                await sleep(wait)

                return jikanRequest<T>(
                    path,
                    retry + 1,
                )
            }
        }

        if (!response.ok) {
            throw new Error(
                `Jikan request failed: ${response.status}`,
            )
        }

        return (
            await response.json()
        ) as T
    } catch (error) {
        if (
            retry <
            JIKAN_MAX_RETRIES
        ) {
            const wait =
                700 *
                Math.pow(
                    2,
                    retry,
                )

            await sleep(wait)

            return jikanRequest<T>(
                path,
                retry + 1,
            )
        }

        throw error
    }
}

/*
|--------------------------------------------------------------------------
| Sleep
|--------------------------------------------------------------------------
*/

function sleep(
    milliseconds: number,
): Promise<void> {
    return new Promise(
        resolve =>
            window.setTimeout(
                resolve,
                milliseconds,
            ),
    )
}

/*
|--------------------------------------------------------------------------
| Metadata Helpers
|--------------------------------------------------------------------------
*/

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
    switch (format) {
        case 'TV':
            return 'TV'

        case 'MOVIE':
            return 'Movie'

        default:
            return undefined
    }
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

/*
|--------------------------------------------------------------------------
| Character Mapper
|--------------------------------------------------------------------------
*/

function mapCharacter(
    edge: AniListCharacterNode,
): Character | null {
    const name =
        edge.node.name.full?.trim()

    const avatar =
        edge.node.image?.medium

    if (!name || !avatar) {
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
            edge.role === 'MAIN'
                ? 'Main'
                : 'Supporting',

        avatar,

        ...(voiceActor?.name?.full &&
            voiceActor?.image?.medium
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

/*
|--------------------------------------------------------------------------
| Jikan Episode Mapper
|--------------------------------------------------------------------------
*/

function mapJikanEpisode(
    episode: JikanEpisode,
    episodeNumber: number,
    animePoster: string,
    duration?: number,
): Episode {
    const title =
        episode.title?.trim() ||
        `Episode ${episodeNumber}`

    return {
        id:
            `jikan-${episode.mal_id}`,

        number:
            episodeNumber,

        title,

        duration:
            duration ||
            undefined,

        thumbnail:
            animePoster ||
            undefined,
    }
}

/*
|--------------------------------------------------------------------------
| Generate Safe Fallback Episodes
|--------------------------------------------------------------------------
|
| If Jikan is temporarily unavailable but AniList knows the
| total episode count, we still render a complete episode list
| instead of showing "Episodes unavailable".
|
*/

function createFallbackEpisodes(
    totalEpisodes: number,
    animePoster: string,
    duration?: number,
): Episode[] {
    if (
        !Number.isFinite(
            totalEpisodes,
        ) ||
        totalEpisodes <= 0
    ) {
        return []
    }

    const safeTotal =
        Math.min(
            Math.floor(
                totalEpisodes,
            ),
            3000,
        )

    return Array.from(
        {
            length:
                safeTotal,
        },
        (_, index) => {
            const number =
                index + 1

            return {
                id:
                    `fallback-episode-${number}`,

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

/*
|--------------------------------------------------------------------------
| Fetch One Jikan Episode Page
|--------------------------------------------------------------------------
*/

async function getJikanEpisodePage(
    malId: number,
    page: number,
    animePoster: string,
    duration?: number,
): Promise<{
    episodes: Episode[]
    hasNextPage: boolean
}> {
    const response =
        await jikanRequest<JikanEpisodesResponse>(
            `/anime/${malId}/episodes?page=${page}`,
        )

    const rawEpisodes =
        response.data || []

    const apiPageSize =
        response.pagination
            ?.items
            ?.per_page ||
        JIKAN_PAGE_SIZE

    const episodes =
        rawEpisodes.map(
            (
                episode,
                index,
            ) => {
                const episodeNumber =
                    ((page - 1) *
                        apiPageSize) +
                    index +
                    1

                return mapJikanEpisode(
                    episode,
                    episodeNumber,
                    animePoster,
                    duration,
                )
            },
        )

    return {
        episodes,

        hasNextPage:
            response.pagination
                ?.has_next_page === true,
    }
}

/*
|--------------------------------------------------------------------------
| Fetch ALL Anime Episodes
|--------------------------------------------------------------------------
*/

export async function getAllAnimeEpisodes(
    malId: number,
    animePoster = '',
    duration?: number,
): Promise<Episode[]> {
    if (
        !Number.isInteger(malId) ||
        malId <= 0
    ) {
        return []
    }

    const allEpisodes: Episode[] = []

    let page = 1

    const MAX_PAGES = 100

    while (
        page <= MAX_PAGES
    ) {
        const result =
            await getJikanEpisodePage(
                malId,
                page,
                animePoster,
                duration,
            )

        allEpisodes.push(
            ...result.episodes,
        )

        if (
            !result.hasNextPage ||
            result.episodes.length === 0
        ) {
            break
        }

        page += 1

        await sleep(
            JIKAN_REQUEST_DELAY_MS,
        )
    }

    return allEpisodes
}

/*
|--------------------------------------------------------------------------
| AniList → 7anime Mapper
|--------------------------------------------------------------------------
*/

export function mapAniListAnime(
    source: AniListAnime,
): Anime {
    const studio =
        source.studios?.nodes?.[0]
            ?.name

    const characters =
        source.characters?.edges
            ?.map(mapCharacter)
            .filter(
                (
                    character,
                ): character is Character =>
                    character !== null,
            )

    const poster =
        source.coverImage?.extraLarge ||
        source.coverImage?.large ||
        source.coverImage?.medium ||
        ''

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
            source.coverImage
                ?.extraLarge ||
            source.coverImage
                ?.large ||
            poster,

        banner:
            source.bannerImage ||
            poster,

        episode:
            source.episodes
                ? `EP ${source.episodes}`
                : undefined,

        status:
            mapStatus(
                source.status,
            ),

        rating:
            source.averageScore
                ? source.averageScore / 10
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

        ...(characters &&
            characters.length > 0
            ? {
                characters,
            }
            : {}),
    }
}

/*
|--------------------------------------------------------------------------
| Get Anime By AniList ID
|--------------------------------------------------------------------------
|
| IMPORTANT:
| 1. AniList gives metadata + MAL ID.
| 2. Jikan gives the complete episode catalogue.
| 3. If Jikan fails, we generate safe fallback episodes.
|
*/

export async function getAnimeById(
    id: number,
): Promise<Anime> {
    const data =
        await aniListRequest<{
            Media: AniListAnime
        }>(
            ANIME_DETAILS_QUERY,
            { id },
        )

    const source =
        data.Media

    const anime =
        mapAniListAnime(
            source,
        )

    const animePoster =
        anime.poster

    const duration =
        source.duration ||
        undefined

    /*
     * Jikan is only needed for episodes.
     * If the anime has no MAL ID, skip it.
     */
    if (
        source.idMal &&
        Number.isInteger(
            source.idMal,
        )
    ) {
        try {
            const episodes =
                await getAllAnimeEpisodes(
                    source.idMal,
                    animePoster,
                    duration,
                )

            if (
                episodes.length > 0
            ) {
                anime.episodesList =
                    episodes

                return anime
            }
        } catch (error) {
            console.warn(
                'Jikan episode request failed. Using AniList episode count fallback.',
                error,
            )
        }
    }

    /*
     * Final safety fallback.
     */
    const fallbackEpisodes =
        createFallbackEpisodes(
            source.episodes || 0,
            animePoster,
            duration,
        )

    if (
        fallbackEpisodes.length > 0
    ) {
        anime.episodesList =
            fallbackEpisodes
    }

    return anime
}

/*
|--------------------------------------------------------------------------
| Search Anime
|--------------------------------------------------------------------------
*/

export async function searchAnime(
    search: string,
    page = 1,
    perPage = 12,
): Promise<Anime[]> {
    const normalizedSearch =
        search.trim()

    if (!normalizedSearch) {
        return []
    }

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

                page,

                perPage,
            },
        )

    return data.Page.media.map(
        mapAniListAnime,
    )
}

/*
|--------------------------------------------------------------------------
| Upcoming Anime
|--------------------------------------------------------------------------
*/

export type UpcomingAnimeItem = {
    anime: Anime

    episode: number

    airingAt: number

    timeUntilAiring: number
}

export async function getUpcomingAnime(
    page = 1,
    perPage = 20,
): Promise<UpcomingAnimeItem[]> {
    const data =
        await aniListRequest<{
            Page: {
                airingSchedules:
                AniListAiringItem[]
            }
        }>(
            AIRING_ANIME_QUERY,
            {
                page,
                perPage,
            },
        )

    return data.Page.airingSchedules.map(
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