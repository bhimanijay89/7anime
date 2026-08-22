const ANIKOTO_BASE_URL =
    process.env.ANIKOTO_API_BASE_URL ||
    'https://anikotoapi.site'

/*
 * =========================================================
 * Anikoto API Types
 * =========================================================
 */

export interface AnikotoEpisode {
    id: number
    title: string
    jp_title?: string
    number: number
    episode_embed_id?: string

    embed_url?: {
        sub?: string
        dub?: string
    }

    updated_at?: string
}

export interface AnikotoAnime {
    id: number
    title: string
    alternative?: string
    titles?: string
    native?: string
    slug?: string

    poster?: string

    is_dub?: number
    is_sub?: number

    description?: string
    aired?: string
    season?: string
    year?: number
    duration?: string
    status?: string
    score?: string
    mal_id?: string
    episodes?: string
    ani_id?: string

    source?: string
    s_id?: number

    background_image?: string
    updated_at?: string

    next_air_schedule_time?: number
    next_air_ep?: number

    terms_by_type?: {
        genre?: string[]
        producers?: string[]
        studios?: string[]
        type?: string[]
    }
}

export interface AnikotoRecentAnimeResponse {
    ok: boolean

    data?: {
        anime?: AnikotoAnime[]
        pagination?: {
            page: number
            per_page: number
            total: number
            total_pages: number
        }
    }

    error?: string
}

export interface AnikotoSeriesResponse {
    ok: boolean

    data?: {
        anime: AnikotoAnime
        episodes: AnikotoEpisode[]
    }

    error?: string
}

/*
 * =========================================================
 * Generic API request
 * =========================================================
 */

async function anikotoRequest<T>(
    endpoint: string,
): Promise<T> {
    const url =
        `${ANIKOTO_BASE_URL}${endpoint}`

    console.log(
        `[Anikoto] GET ${url}`,
    )

    const response =
        await fetch(url, {
            method: 'GET',
            headers: {
                Accept:
                    'application/json',
            },
        })

    if (!response.ok) {
        throw new Error(
            `Anikoto API returned HTTP ${response.status}`,
        )
    }

    const data =
        (await response.json()) as T

    return data
}

/*
 * =========================================================
 * Get recent anime
 * =========================================================
 *
 * The Anikoto API provides:
 *
 * GET /recent-anime?page=1&per_page=100
 *
 * We use this to find the Anikoto series ID
 * corresponding to an AniList ID.
 * =========================================================
 */

export async function getRecentAnime(
    page = 1,
    perPage = 100,
): Promise<AnikotoRecentAnimeResponse> {
    const params =
        new URLSearchParams({
            page:
                String(page),

            per_page:
                String(perPage),
        })

    return anikotoRequest<AnikotoRecentAnimeResponse>(
        `/recent-anime?${params.toString()}`,
    )
}

/*
 * =========================================================
 * Find Anikoto anime by AniList ID
 * =========================================================
 */

export async function findAnikotoIdByAniListId(
    anilistId: number,
): Promise<number | null> {
    /*
     * Search multiple pages because the API is paginated.
     *
     * We don't blindly assume that the anime is on page 1.
     */

    const MAX_PAGES = 20

    for (
        let page = 1;
        page <= MAX_PAGES;
        page++
    ) {
        const result =
            await getRecentAnime(
                page,
                100,
            )

        if (
            !result.ok ||
            !result.data
        ) {
            continue
        }

        const animeList =
            result.data.anime ??
            []

        const match =
            animeList.find(
                (anime) =>
                    Number(
                        anime.ani_id,
                    ) ===
                    anilistId,
            )

        if (match) {
            console.log(
                `[Anikoto] Matched AniList ${anilistId} → Anikoto ${match.id}`,
            )

            return match.id
        }

        /*
         * Stop if there are no more pages.
         */

        const pagination =
            result.data.pagination

        if (
            pagination &&
            page >=
            pagination.total_pages
        ) {
            break
        }
    }

    console.warn(
        `[Anikoto] No series found for AniList ID ${anilistId}`,
    )

    return null
}

/*
 * =========================================================
 * Get series + all episodes
 * =========================================================
 *
 * GET /series/{id}
 * =========================================================
 */

export async function getSeriesById(
    anikotoId: number,
): Promise<AnikotoSeriesResponse> {
    return anikotoRequest<AnikotoSeriesResponse>(
        `/series/${encodeURIComponent(
            String(anikotoId),
        )}`,
    )
}

/*
 * =========================================================
 * Get available episodes
 * =========================================================
 *
 * Only return episodes that actually exist and have
 * at least one playable stream.
 *
 * This prevents fake/generated episodes from appearing.
 * =========================================================
 */

export function getAvailableEpisodes(
    episodes: AnikotoEpisode[],
): AnikotoEpisode[] {
    return episodes
        .filter(
            (episode) =>
                Number.isFinite(
                    episode.number,
                ) &&
                episode.number > 0 &&
                Boolean(
                    episode.embed_url
                        ?.sub ||
                    episode.embed_url
                        ?.dub,
                ),
        )
        .sort(
            (a, b) =>
                a.number -
                b.number,
        )
}

/*
 * =========================================================
 * Get a single episode
 * =========================================================
 */

export function getEpisodeByNumber(
    episodes: AnikotoEpisode[],
    episodeNumber: number,
): AnikotoEpisode | null {
    return (
        episodes.find(
            (episode) =>
                episode.number ===
                episodeNumber,
        ) ?? null
    )
}

/*
 * =========================================================
 * Get stream URL
 * =========================================================
 */

export function getEpisodeStreamUrl(
    episode: AnikotoEpisode,
    language:
        | 'sub'
        | 'dub',
): string | null {
    return (
        episode.embed_url?.[
        language
        ] ?? null
    )
}