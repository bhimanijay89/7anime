import { Router } from 'express'

import {
    getAnimeById,
    getAiringSchedule,
    getTrendingAnime,
    getPopularAnime,
    getUpcomingAnime,
    getAnimeMovies,
    searchAnime,
} from '../services/anilist.js'
import {
    resolveTmdbMapping,
    resolveTmdbLogo,
    CURATED_HERO_ANIME,
    ensureCuratedHeroLogos,
} from '../services/tmdb.js'

import type {
    AniListAnime,
    UnifiedAnime,
    UnifiedEpisode,
    AnimeLogoResult,
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

function cleanSynopsisText(raw?: string | null): string | undefined {
    if (!raw) return undefined
    return raw
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;|&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

export function mapAniListToUnified(aniListAnime: AniListAnime): UnifiedAnime {
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
        synopsis: cleanSynopsisText(aniListAnime.description),
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

/* GET /api/anime/movies */
router.get('/anime/movies', async (req, res) => {
    try {
        const page = req.query.page ? Number(req.query.page) : 1
        const perPage = req.query.perPage ? Number(req.query.perPage) : 25
        const list = await getAnimeMovies(page, perPage)
        const animeList = list.map(mapAniListToUnified)
        return sendSuccess(res, animeList)
    } catch (error) {
        console.error('[GET /api/anime/movies]', error)
        return sendError(res, 'Unable to load anime movies.', ErrorCode.SERVICE_UNAVAILABLE, 502)
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

/* GET /api/anime/curated-hero */
router.get('/anime/curated-hero', async (_req, res) => {
    try {
        const logosMap = await ensureCuratedHeroLogos()
        const animeList: UnifiedAnime[] = []

        for (const item of CURATED_HERO_ANIME) {
            try {
                const aniListAnime = await getAnimeById(item.anilistId)
                const unified = mapAniListToUnified(aniListAnime)
                unified.tmdbId = item.tmdbId
                unified.mediaType = item.mediaType
                const logo = logosMap[item.anilistId]
                if (logo) {
                    (unified as unknown as { logo: unknown }).logo = {
                        url: logo.logoUrl,
                        logoUrl: logo.logoUrl,
                        aspectRatio: logo.aspectRatio,
                        width: logo.width,
                        height: logo.height,
                        language: logo.language,
                        filePath: logo.filePath,
                    }
                }
                animeList.push(unified)
            } catch (fetchErr) {
                console.warn(`[GET /api/anime/curated-hero] Error loading anime ${item.anilistId}:`, fetchErr)
            }
        }

        return sendSuccess(res, animeList)
    } catch (error) {
        console.error('[GET /api/anime/curated-hero]', error)
        return sendError(res, 'Failed to load curated hero anime.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/logos */
router.get('/anime/logos', async (req, res) => {
    try {
        const rawParam = req.query.ids
        if (!rawParam || (typeof rawParam !== 'string' && !Array.isArray(rawParam))) {
            return sendError(
                res,
                'Missing or empty "ids" parameter. Provide comma-separated positive integer AniList IDs.',
                ErrorCode.BAD_REQUEST,
                400,
            )
        }

        const idStrings = (Array.isArray(rawParam) ? rawParam.join(',') : String(rawParam))
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)

        if (idStrings.length === 0) {
            return sendError(res, 'Missing or empty "ids" parameter.', ErrorCode.BAD_REQUEST, 400)
        }

        for (const token of idStrings) {
            if (!/^\d+$/.test(token) || Number(token) <= 0) {
                return sendError(
                    res,
                    `Invalid ID "${token}". All IDs must be positive integers.`,
                    ErrorCode.INVALID_ID,
                    400,
                )
            }
        }

        const uniqueIds = Array.from(new Set(idStrings.map(Number)))

        const MAX_BATCH_SIZE = 20
        if (uniqueIds.length > MAX_BATCH_SIZE) {
            return sendError(
                res,
                `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE} IDs.`,
                ErrorCode.BAD_REQUEST,
                400,
            )
        }

        const CONCURRENCY_LIMIT = 10
        const results: Record<string, AnimeLogoResult | null> = {}

        for (let i = 0; i < uniqueIds.length; i += CONCURRENCY_LIMIT) {
            const chunk = uniqueIds.slice(i, i + CONCURRENCY_LIMIT)
            const chunkResults = await Promise.all(
                chunk.map(async (id) => {
                    try {
                        const logo = await resolveTmdbLogo(id)
                        return { id, logo }
                    } catch (err) {
                        console.warn(`[GET /api/anime/logos] Error resolving logo for ${id}:`, err)
                        return { id, logo: null }
                    }
                })
            )
            for (const { id, logo } of chunkResults) {
                results[String(id)] = logo
            }
        }

        return sendSuccess(res, results)
    } catch (error) {
        console.error('[GET /api/anime/logos]', error)
        return sendError(res, 'Failed to resolve anime logos.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

/* GET /api/anime/:anilistId/mapping */
router.get('/anime/:anilistId/mapping', async (req, res) => {
    try {
        const anilistId = Number(req.params.anilistId)
        if (!Number.isInteger(anilistId) || anilistId <= 0) {
            return sendError(res, 'Invalid AniList anime ID.', ErrorCode.INVALID_ID, 400)
        }

        let aniListAnime: AniListAnime | null = null
        try {
            aniListAnime = await getAnimeById(anilistId)
        } catch {
            aniListAnime = {
                id: anilistId,
                title: {
                    english: req.query.title ? String(req.query.title) : undefined,
                    romaji: req.query.romaji ? String(req.query.romaji) : undefined,
                },
                format: req.query.format ? String(req.query.format) : undefined,
                seasonYear: req.query.year ? Number(req.query.year) : undefined,
            }
        }

        const mapping = await resolveTmdbMapping(aniListAnime)
        if (!mapping || !mapping.tmdbId) {
            return sendSuccess(res, {
                anilistId,
                tmdbId: null,
                mediaType: null,
                season: 1,
            })
        }

        return sendSuccess(res, {
            anilistId,
            tmdbId: mapping.tmdbId,
            mediaType: mapping.mediaType,
            season: mapping.season || 1,
        })
    } catch (error) {
        console.error('[GET /api/anime/:anilistId/mapping]', error)
        return sendError(res, 'Failed to resolve streaming server mapping.', ErrorCode.SERVICE_UNAVAILABLE, 502)
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

        // Automatically resolve TMDB mapping for Server 1 playback
        try {
            const tmdbMapping = await resolveTmdbMapping(aniListAnime)
            if (tmdbMapping) {
                anime.tmdbId = tmdbMapping.tmdbId
                anime.mediaType = tmdbMapping.mediaType
            }
        } catch (tmdbErr) {
            console.warn('[GET /api/anime/:anilistId] TMDB resolution skipped:', tmdbErr)
        }

        const isCached = Boolean((aniListAnime as unknown as Record<string, unknown>)._cached)
        return sendSuccess(res, anime, { cached: isCached })
    } catch (error) {
        console.error('[GET /api/anime/:anilistId]', error)
        return sendError(res, 'Unable to load anime data.', ErrorCode.SERVICE_UNAVAILABLE, 502)
    }
})

export default router
