export interface AniListTitle {
    romaji?: string | null
    english?: string | null
    native?: string | null
}

export interface AniListCoverImage {
    medium?: string | null
    large?: string | null
    extraLarge?: string | null
}

export interface AniListStudio {
    name: string
}

export interface AniListCharacterEdge {
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

export interface AniListAnime {
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
        nodes?: AniListStudio[]
    } | null

    characters?: {
        edges?: AniListCharacterEdge[]
    } | null
}

export interface AniListAiringScheduleItem {
    id: number
    airingAt: number
    episode: number
    timeUntilAiring: number
    media: AniListAnime
}

export interface AniListGraphQLError {
    message?: string
    status?: number
}

export interface AniListResponse<T> {
    data?: T
    errors?: AniListGraphQLError[]
}

/*
 * ---------------------------------------------------------
 * Unified 7anime backend response
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 * AniList is the canonical anime identity and metadata source.
 *
 * MegaPlay is used for playback using:
 *
 *     AniList ID + Episode Number + Language
 *
 * Anikoto is intentionally NOT part of the canonical model.
 * ---------------------------------------------------------
 */

export interface UnifiedEpisode {
    id: string
    number: number
    title: string

    japaneseTitle?: string

    /*
     * Playback provider.
     *
     * The provider is now MegaPlay.
     * The actual embed URL is resolved separately from:
     *
     *     AniList ID
     *     Episode Number
     *     Language
     */
    provider: {
        name: 'megaplay'
        episodeId?: string
        embedId?: string
    }

    /*
     * Streams are optional because playback URLs are resolved
     * separately by the MegaPlay playback flow.
     */
    streams: {
        sub?: string
        dub?: string
    }

    updatedAt?: string
}

export interface UnifiedAnime {
    id: string
    anilistId: number

    title: string

    alternativeTitle?: string
    nativeTitle?: string

    poster: string
    cover?: string
    banner?: string

    malId?: number

    status:
    | 'Airing'
    | 'Completed'
    | 'Upcoming'
    | 'Unknown'

    rating?: number

    genres: string[]

    type?: string

    year?: number

    synopsis?: string

    studio?: string

    source?: string

    duration?: string

    /*
     * AniList planned/known episode count.
     */
    totalEpisodes?: number

    /*
     * Number of episodes represented by the canonical
     * episode catalogue.
     */
    availableEpisodes: number

    /*
     * AniList itself does not provide reliable sub/dub
     * availability information for our MegaPlay playback
     * layer, so these represent the currently known
     * canonical episode count rather than Anikoto streams.
     */
    subEpisodes: number
    dubEpisodes: number

    /*
     * Anikoto metadata has intentionally been removed.
     */

    episodes: UnifiedEpisode[]
}

export interface ApiMeta {
    timestamp: string
    requestId: string
    cached?: boolean
    [key: string]: unknown
}

export interface ApiSuccessResponse<T> {
    ok: true
    data: T
    meta: ApiMeta
}

export interface ApiErrorDetail {
    message: string
    code: string
    details?: unknown
}

export interface ApiErrorResponse {
    ok: false
    error: ApiErrorDetail
    meta: ApiMeta
}

export type ApiResponse<T> =
    | ApiSuccessResponse<T>
    | ApiErrorResponse