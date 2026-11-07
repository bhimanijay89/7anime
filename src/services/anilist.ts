import type {
    Anime,
    AnimeLogo,
    Character,
    Episode,
} from '../types/domain'

import { resolveVideoEmbedUrl } from './videoResolver'
import { isDevToolsActive } from '../utils/security'

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
    if (isDevToolsActive()) {
        throw new Error('DevTools active — network API call suppressed for security decoy mode.')
    }

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
   BACKEND API & AIRING SCHEDULE
   ========================================================= */

export const BACKEND_URL =
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : (((import.meta as any).env?.VITE_API_URL as string | undefined) || 'https://sevenanime-vodw.onrender.com')

export interface AnimeMappingData {
    anilistId: number
    tmdbId?: number | null
    mediaType?: 'movie' | 'tv' | null
    season?: number
    confidence?: string
    source?: string
}

export async function fetchAnimeMapping(anilistId: number | string): Promise<AnimeMappingData> {
    const id = Number(anilistId)
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid AniList ID provided for mapping')
    }

    const response = await fetch(`${BACKEND_URL}/api/anime/${id}/mapping`)
    if (!response.ok) {
        throw new Error(`Mapping service returned HTTP ${response.status}`)
    }

    let json: any
    try {
        json = await response.json()
    } catch {
        throw new Error('Invalid JSON received from mapping service')
    }

    if (!json || typeof json !== 'object' || !json.ok || !json.data) {
        throw new Error(json?.error?.message || 'Invalid mapping response payload')
    }

    return json.data as AnimeMappingData
}

/**
 * Fetches official anime logos from TMDB via the backend batch endpoint.
 * Accepts an array of AniList IDs and returns a map keyed by AniList ID.
 * Gracefully handles failures without throwing, returning a safe partial or empty record.
 */
export async function fetchAnimeLogos(
    anilistIds: number[],
): Promise<Record<number, AnimeLogo | null>> {
    const validIds = Array.from(
        new Set(
            (anilistIds || [])
                .map(id => Number(id))
                .filter(id => Number.isInteger(id) && id > 0),
        ),
    )

    if (validIds.length === 0) {
        return {}
    }

    try {
        const query = validIds.join(',')
        const response = await fetch(`${BACKEND_URL}/api/anime/logos?ids=${encodeURIComponent(query)}`)
        if (!response.ok) {
            console.warn(`[fetchAnimeLogos] Backend returned HTTP ${response.status}`)
            return {}
        }

        const json = await response.json()
        if (!json || (!json.ok && !json.success) || !json.data) {
            return {}
        }

        const rawData = json.data as Record<string, {
            logoUrl: string
            aspectRatio?: number
            width?: number
            height?: number
            language?: string | null
            filePath?: string
        } | null>

        const result: Record<number, AnimeLogo | null> = {}
        for (const [idStr, logoItem] of Object.entries(rawData)) {
            const numId = Number(idStr)
            if (!Number.isInteger(numId) || numId <= 0) continue

            if (!logoItem || !logoItem.logoUrl) {
                const curated = CURATED_HERO_REF_MAP.get(numId)
                if (curated) {
                    result[numId] = {
                        url: normalizeLogoUrl(curated.assetPath),
                        aspectRatio: curated.aspectRatio,
                        width: curated.width,
                        height: curated.height,
                        language: 'en',
                        filePath: curated.assetPath,
                    }
                } else {
                    result[numId] = null
                }
            } else {
                result[numId] = {
                    url: normalizeLogoUrl(logoItem.logoUrl),
                    aspectRatio: logoItem.aspectRatio,
                    width: logoItem.width,
                    height: logoItem.height,
                    language: logoItem.language ?? null,
                    filePath: logoItem.filePath,
                }
            }
        }

        return result
    } catch (err) {
        console.warn('[fetchAnimeLogos] Failed to fetch logos:', err)
        return {}
    }
}

/* =========================================================
   CLIENT-SIDE IN-MEMORY CACHE & REQUEST DEDUPLICATION
   ========================================================= */

interface ClientCacheEntry<T> {
    data: T
    timestamp: number
}

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const clientMemoryCache = new Map<string, ClientCacheEntry<any>>()
const clientInflightRequests = new Map<string, Promise<any>>()

export function getCachedAnimeData<T>(key: string): T | null {
    const entry = clientMemoryCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CLIENT_CACHE_TTL_MS) {
        clientMemoryCache.delete(key)
        return null
    }
    return entry.data as T
}

export function setCachedAnimeData<T>(key: string, data: T): void {
    clientMemoryCache.set(key, {
        data,
        timestamp: Date.now(),
    })
}

export function getCachedAnimeMoviesSync(): Anime[] | null {
    return (
        getCachedAnimeData<Anime[]>('movies:1:35:POPULARITY_DESC') ||
        getCachedAnimeData<Anime[]>('movies:1:35') ||
        getCachedAnimeData<Anime[]>('movies:1:30:POPULARITY_DESC') ||
        null
    )
}

export function clearClientAnimeCache(): void {
    clientMemoryCache.clear()
    clientInflightRequests.clear()
}

export interface CuratedAnimeReference {
    anilistId: number
    tmdbId: number
    mediaType: 'tv' | 'movie'
    title: string
    slug: string
    assetPath: string
    aspectRatio: number
    width: number
    height: number
}

export function normalizeLogoUrl(rawUrl?: string): string {
    if (!rawUrl) return ''
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
        return rawUrl
    }
    if (rawUrl.startsWith('/')) {
        return `${BACKEND_URL}${rawUrl}`
    }
    return rawUrl
}

export const CURATED_HERO_REFERENCES: CuratedAnimeReference[] = [
    { anilistId: 21, tmdbId: 37854, mediaType: 'tv', title: 'One Piece', slug: 'one-piece', assetPath: '/assets/hero-logos/one-piece.png', aspectRatio: 2.89, width: 500, height: 173 },
    { anilistId: 1735, tmdbId: 31910, mediaType: 'tv', title: 'Naruto Shippuden', slug: 'naruto-shippuden', assetPath: '/assets/hero-logos/naruto-shippuden.png', aspectRatio: 1.908, width: 500, height: 262 },
    { anilistId: 269, tmdbId: 30984, mediaType: 'tv', title: 'Bleach', slug: 'bleach', assetPath: '/assets/hero-logos/bleach.png', aspectRatio: 2.793, width: 500, height: 179 },
    { anilistId: 97940, tmdbId: 73223, mediaType: 'tv', title: 'Black Clover', slug: 'black-clover', assetPath: '/assets/hero-logos/black-clover.png', aspectRatio: 5.747, width: 500, height: 87 },
    { anilistId: 101922, tmdbId: 85937, mediaType: 'tv', title: 'Demon Slayer', slug: 'demon-slayer', assetPath: '/assets/hero-logos/demon-slayer.png', aspectRatio: 1.055, width: 499, height: 473 },
    { anilistId: 113415, tmdbId: 95479, mediaType: 'tv', title: 'Jujutsu Kaisen', slug: 'jujutsu-kaisen', assetPath: '/assets/hero-logos/jujutsu-kaisen.png', aspectRatio: 4.464, width: 500, height: 112 },
    { anilistId: 16498, tmdbId: 1429, mediaType: 'tv', title: 'Attack on Titan', slug: 'attack-on-titan', assetPath: '/assets/hero-logos/attack-on-titan.png', aspectRatio: 3.448, width: 500, height: 145 },
    { anilistId: 151807, tmdbId: 127532, mediaType: 'tv', title: 'Solo Leveling', slug: 'solo-leveling', assetPath: '/assets/hero-logos/solo-leveling.png', aspectRatio: 3.623, width: 500, height: 138 },
    { anilistId: 813, tmdbId: 12971, mediaType: 'tv', title: 'Dragon Ball Z', slug: 'dragon-ball-z', assetPath: '/assets/hero-logos/dragon-ball-z.png', aspectRatio: 3.817, width: 500, height: 131 },
    { anilistId: 1535, tmdbId: 13916, mediaType: 'tv', title: 'Death Note', slug: 'death-note', assetPath: '/assets/hero-logos/death-note.png', aspectRatio: 4.057, width: 499, height: 123 },
]

export const CURATED_HERO_REF_MAP = new Map<number, CuratedAnimeReference>(
    CURATED_HERO_REFERENCES.map(r => [r.anilistId, r])
)

/**
 * Phase 3.2: Loads the fixed collection of 10 curated Hero anime with official TMDB logos.
 * Does not depend on dynamic AniList trending rankings.
 */
export async function fetchCuratedHeroAnime(): Promise<Anime[]> {
    const cacheKey = 'hero:curated:10'
    const cached = getCachedAnimeData<Anime[]>(cacheKey)
    if (cached && cached.length > 0) return cached

    const inflight = clientInflightRequests.get(cacheKey)
    if (inflight) return inflight

    const runFetch = async (): Promise<Anime[]> => {
    try {
        const res = await fetch(`${BACKEND_URL}/api/anime/curated-hero`)
        if (res.ok) {
            const json = await res.json()
            if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                return (json.data as (Anime & { logo?: { logoUrl?: string; url?: string; aspectRatio?: number; width?: number; height?: number; filePath?: string } })[]).map(a => {
                    const curated = CURATED_HERO_REF_MAP.get(Number(a.id))
                    if (a.logo) {
                        const rawUrl = a.logo.url || a.logo.logoUrl || (curated ? curated.assetPath : '')
                        const url = normalizeLogoUrl(rawUrl)
                        a.logo.url = url
                        a.logo.logoUrl = url
                        if (curated && !a.logo.aspectRatio) {
                            a.logo.aspectRatio = curated.aspectRatio
                        }
                    } else if (curated) {
                        (a as any).logo = {
                            url: normalizeLogoUrl(curated.assetPath),
                            logoUrl: normalizeLogoUrl(curated.assetPath),
                            aspectRatio: curated.aspectRatio,
                            width: curated.width,
                            height: curated.height,
                            language: 'en',
                            filePath: curated.assetPath,
                        }
                    }
                    if (a.synopsis) {
                        a.synopsis = cleanDescription(a.synopsis)
                    }
                    return a as Anime
                })
            }
        }
    } catch (err) {
        console.warn('[fetchCuratedHeroAnime] Backend endpoint unavailable, falling back to direct query:', err)
    }

    try {
        const [animeResults, logosMap] = await Promise.all([
            Promise.all(
                CURATED_HERO_REFERENCES.map(async (ref) => {
                    try {
                        const anime = await getAnimeById(ref.anilistId)
                        anime.tmdbId = ref.tmdbId
                        anime.mediaType = ref.mediaType
                        if (anime.synopsis) {
                            anime.synopsis = cleanDescription(anime.synopsis)
                        }
                        return anime
                    } catch {
                        return null
                    }
                }),
            ),
            fetchAnimeLogos(CURATED_HERO_REFERENCES.map(r => r.anilistId)),
        ])

        return animeResults
            .filter((a): a is Anime => a !== null)
            .map(anime => {
                const logo = logosMap[Number(anime.id)]
                if (logo) {
                    const url = logo.url || (logo as unknown as { logoUrl?: string }).logoUrl || ''
                    return {
                        ...anime,
                        logo: {
                            ...logo,
                            url,
                            logoUrl: url,
                        },
                    }
                }
                return anime
            })
    } catch (fallbackErr) {
        console.error('[fetchCuratedHeroAnime] Failed to load curated anime:', fallbackErr)
        return []
    }
    }

    const promise = runFetch().then(res => {
        if (res && res.length > 0) setCachedAnimeData(cacheKey, res)
        return res
    }).finally(() => {
        clientInflightRequests.delete(cacheKey)
    })

    clientInflightRequests.set(cacheKey, promise)
    return promise
}

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
   ANIME MOVIES
   ========================================================= */

const ANIME_MOVIES_QUERY = `
    query AnimeMovies(
        $page: Int
        $perPage: Int
        $sort: [MediaSort]
    ) {
        Page(
            page: $page
            perPage: $perPage
        ) {
            media(
                type: ANIME
                format: MOVIE
                sort: $sort
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

export async function getAnimeMovies(
    page = 1,
    perPage = 35,
    sort: 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC' = 'POPULARITY_DESC',
): Promise<Anime[]> {
    const safePage = Math.max(1, Math.floor(page))
    const safePerPage = Math.min(50, Math.max(1, Math.floor(perPage)))
    const cacheKey = `movies:${safePage}:${safePerPage}:${sort}`

    const cached = getCachedAnimeData<Anime[]>(cacheKey)
    if (cached && cached.length > 0) {
        return cached
    }

    const inflight = clientInflightRequests.get(cacheKey)
    if (inflight) {
        return inflight
    }

    const fetchPromise = (async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/anime/movies?page=${safePage}&perPage=${safePerPage}`)
            if (res.ok) {
                const json = await res.json()
                if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                    const list = (json.data as Anime[]).map(a => ({
                        ...a,
                        type: 'Movie' as const,
                    }))
                    setCachedAnimeData(cacheKey, list)
                    return list
                }
            }
        } catch {
            // Fallback to direct AniList GraphQL
        }

        try {
            const data = await aniListRequest<{
                Page: {
                    media: AniListAnime[]
                }
            }>(
                ANIME_MOVIES_QUERY,
                {
                    page: safePage,
                    perPage: safePerPage,
                    sort: [sort],
                },
            )

            const list = (data.Page.media || []).map(mapAniListAnime).map(a => ({
                ...a,
                type: 'Movie' as const,
            }))
            if (list.length > 0) {
                setCachedAnimeData(cacheKey, list)
            }
            return list
        } catch (fallbackErr) {
            console.error('[getAnimeMovies] Failed to load anime movies:', fallbackErr)
            return []
        } finally {
            clientInflightRequests.delete(cacheKey)
        }
    })()

    clientInflightRequests.set(cacheKey, fetchPromise)
    return fetchPromise
}

export function prefetchAnimeMovies(): void {
    getAnimeMovies(1, 35).catch(() => {})
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
    language: 'sub' | 'dub' = 'sub',
    malId?: number | string | null,
    server: string = 'server1',
): string {
    return resolveVideoEmbedUrl({
        server,
        malId,
        anilistId: animeId,
        episodeNumber,
        language,
    })
}

export function getAnimeStreamEmbedUrl(
    server: string,
    animeId: string | number,
    episodeNumber: number,
    language: 'sub' | 'dub' = 'sub',
    malId?: number | string | null,
    tmdbId?: number | string | null,
    mediaType?: 'movie' | 'tv' | string | null,
    seasonNumber?: number | string | null,
): string {
    return resolveVideoEmbedUrl({
        server,
        tmdbId,
        mediaType,
        seasonNumber,
        malId,
        anilistId: animeId,
        episodeNumber,
        language,
    })
}