import { Router } from 'express'

import {
    getAnimeById,
    getAiringSchedule,
    getTrendingAnime,
    getPopularAnime,
    getUpcomingAnime,
    searchAnime,
} from '../services/anilist.js'

import type {
    UnifiedAnime,
    UnifiedEpisode,
} from '../types.js'

import {
    ErrorCode,
    sendError,
    sendSuccess,
} from '../utils/response.js'

const router = Router()

function createEpisodeCatalogue(
    anilistId: number,
    totalEpisodes?: number,
): UnifiedEpisode[] {
    if (
        typeof totalEpisodes !== 'number' ||
        !Number.isFinite(totalEpisodes) ||
        totalEpisodes <= 0
    ) {
        return []
    }

    const count = Math.floor(totalEpisodes)

    return Array.from(
        { length: count },
        (_, index) => {
            const episodeNumber = index + 1
            return {
                id: '' + anilistId + '-' + episodeNumber,
                number: episodeNumber,
                title: 'Episode ' + episodeNumber,
                provider: {
                    name: 'megaplay' as const,
                },
                streams: {},
            }
        },
    )
}

function mapAniListToUnified(aniListAnime: any): UnifiedAnime {
    let status: 'Airing' | 'Completed' | 'Upcoming' | 'Unknown' = 'Unknown'

    if (aniListAnime.status === 'RELEASING') {
        status = 'Airing'
    } else if (aniListAnime.status === 'FINISHED') {
        status = 'Completed'
    } else if (aniListAnime.status === 'NOT_YET_RELEASED') {
        status = 'Upcoming'
    }

    const rating =
        typeof aniListAnime.averageScore === 'number'
            ? aniListAnime.averageScore / 10
            : undefined

    let totalEpisodes: number | undefined = undefined

    if (
        typeof aniListAnime.episodes === 'number' &&
        Number.isFinite(aniListAnime.episodes) &&
        aniListAnime.episodes > 0
    ) {
        totalEpisodes = Math.floor(aniListAnime.episodes)
    } else if (
        typeof aniListAnime.nextAiringEpisode?.episode === 'number' &&
        Number.isFinite(aniListAnime.nextAiringEpisode.episode) &&
        aniListAnime.nextAiringEpisode.episode > 1
    ) {
        totalEpisodes = Math.floor(aniListAnime.nextAiringEpisode.episode - 1)
    }

    const episodes = createEpisodeCatalogue(aniListAnime.id, totalEpisodes)

    return {
        id: String(aniListAnime.id),
        anilistId: aniListAnime.id,
        title:
            aniListAnime.title?.english ??
            aniListAnime.title?.romaji ??
            aniListAnime.title?.native ??
            ('Anime ' + aniListAnime.id),
        alternativeTitle: aniListAnime.title?.romaji ?? undefined,
        nativeTitle: aniListAnime.title?.native ?? undefined,
        poster:
            aniListAnime.coverImage?.extraLarge ??
            aniListAnime.coverImage?.large ??
            aniListAnime.coverImage?.medium ??
            '',
        cover:
            aniListAnime.coverImage?.extraLarge ??
            aniListAnime.coverImage?.large ??
            undefined,
        banner: aniListAnime.bannerImage ?? undefined,
        malId: aniListAnime.idMal ?? undefined,
        status,
        rating,
        genres: aniListAnime.genres ?? [],
        type: aniListAnime.format ?? undefined,
        year: aniListAnime.seasonYear ?? undefined,
        synopsis: aniListAnime.description ?? undefined,
        studio: aniListAnime.studios?.nodes?.[0]?.name ?? undefined,
        source: aniListAnime.source ?? undefined,
        duration:
            typeof aniListAnime.duration === 'number'
                ? (aniListAnime.duration + 'm')
                : undefined,
        totalEpisodes,
        availableEpisodes: episodes.length,
        subEpisodes: episodes.length,
        dubEpisodes: episodes.length,
        episodes,
    }
}

/* GET /api/anime/schedule */
router.get('/anime/schedule', async (req, res) => {
    try {
        const start = req.query.start ? Number(req.query.start) : undefined
        const end = req.query.end ? Number(req.query.end) : undefined
        const page = req.query.page ? Number(req.query.page) : 1
        const perPage = req.query.perPage ? Number(req.query.perPage) : 50

        const schedules = await getAiringSchedule(start, end, page, perPage)
        return sendSuccess(res, { schedules })
    } catch (error) {
        console.error('[GET /api/anime/schedule]', error)
        return sendError(res, 'Unable to load airing schedule.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/trending */
router.get('/anime/trending', async (req, res) => {
    try {
        const page = req.query.page ? Number(req.query.page) : 1
        const perPage = req.query.perPage ? Number(req.query.perPage) : 20
        const list = await getTrendingAnime(page, perPage)
        const animeList = list.map(mapAniListToUnified)
        return sendSuccess(res, animeList)
    } catch (error) {
        console.error('[GET /api/anime/trending]', error)
        return sendError(res, 'Unable to load trending anime.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/popular */
router.get('/anime/popular', async (req, res) => {
    try {
        const page = req.query.page ? Number(req.query.page) : 1
        const perPage = req.query.perPage ? Number(req.query.perPage) : 20
        const list = await getPopularAnime(page, perPage)
        const animeList = list.map(mapAniListToUnified)
        return sendSuccess(res, animeList)
    } catch (error) {
        console.error('[GET /api/anime/popular]', error)
        return sendError(res, 'Unable to load popular anime.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/upcoming */
router.get('/anime/upcoming', async (req, res) => {
    try {
        const page = req.query.page ? Number(req.query.page) : 1
        const perPage = req.query.perPage ? Number(req.query.perPage) : 20
        const list = await getUpcomingAnime(page, perPage)
        const animeList = list.map(mapAniListToUnified)
        return sendSuccess(res, animeList)
    } catch (error) {
        console.error('[GET /api/anime/upcoming]', error)
        return sendError(res, 'Unable to load upcoming anime.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/search */
router.get('/anime/search', async (req, res) => {
    try {
        const query = String(req.query.query || req.query.q || req.query.search || '')
        const page = req.query.page ? Number(req.query.page) : 1
        const perPage = req.query.perPage ? Number(req.query.perPage) : 20
        if (!query.trim()) {
            return sendSuccess(res, [])
        }
        const list = await searchAnime(query, page, perPage)
        const animeList = list.map(mapAniListToUnified)
        return sendSuccess(res, animeList)
    } catch (error) {
        console.error('[GET /api/anime/search]', error)
        return sendError(res, 'Unable to search anime.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/:anilistId */
router.get('/anime/:anilistId', async (req, res) => {
    try {
        const anilistId = Number(req.params.anilistId)
        if (!Number.isInteger(anilistId) || anilistId <= 0) {
            return sendError(res, 'Invalid AniList anime ID.', ErrorCode.INVALID_ID, 400)
        }
        const aniListAnime = await getAnimeById(anilistId)
        const anime = mapAniListToUnified(aniListAnime)
        const isCached = Boolean((aniListAnime as unknown as Record<string, unknown>)._cached)
        return sendSuccess(res, anime, { cached: isCached })
    } catch (error) {
        console.error('[GET /api/anime/:anilistId]', error)
        return sendError(res, 'Unable to load anime data.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

export default router
