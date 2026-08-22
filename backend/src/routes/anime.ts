import { Router } from 'express'

import {
    getAnimeById,
    getAiringSchedule,
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

/*
 * =========================================================
 * GET /api/anime/schedule
 * =========================================================
 *
 * Query AniList airing schedule data with Redis caching.
 * Optional query parameters:
 *   - start: Unix epoch timestamp in seconds (airingAt_greater)
 *   - end: Unix epoch timestamp in seconds (airingAt_lesser)
 *   - page: page number (default: 1)
 *   - perPage: items per page (default: 50)
 * =========================================================
 */

router.get(
    '/anime/schedule',
    async (req, res) => {
        try {
            const start = req.query.start ? Number(req.query.start) : undefined
            const end = req.query.end ? Number(req.query.end) : undefined
            const page = req.query.page ? Number(req.query.page) : 1
            const perPage = req.query.perPage ? Number(req.query.perPage) : 50

            const schedules = await getAiringSchedule(start, end, page, perPage)

            return sendSuccess(res, {
                schedules,
            })
        } catch (error) {
            console.error('[GET /api/anime/schedule]', error)
            return sendError(
                res,
                'Unable to load airing schedule.',
                ErrorCode.SERVICE_UNAVAILABLE,
                502,
            )
        }
    },
)

/*
 * =========================================================
 * Build canonical episode catalogue
 * =========================================================
 *
 * AniList is now the canonical anime source.
 *
 * We no longer use Anikoto to discover episode IDs,
 * episode streams, or episode availability.
 *
 * MegaPlay playback is resolved separately by the frontend
 * using:
 *
 *     AniList ID + Episode Number + Language
 *
 * Therefore the backend only needs to provide a stable
 * episode catalogue based on AniList's episode count.
 * =========================================================
 */

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

    const count =
        Math.floor(totalEpisodes)

    return Array.from(
        {
            length: count,
        },
        (_, index) => {
            const episodeNumber =
                index + 1

            return {
                id:
                    `anilist-${anilistId}-episode-${episodeNumber}`,

                number:
                    episodeNumber,

                title:
                    `Episode ${episodeNumber}`,

                japaneseTitle:
                    undefined,

                provider: {
                    name:
                        'megaplay',

                    episodeId:
                        String(
                            episodeNumber,
                        ),

                    embedId:
                        undefined,
                },

                streams: {},

                updatedAt:
                    undefined,
            }
        },
    )
}

/*
 * =========================================================
 * GET /api/anime/:anilistId
 * =========================================================
 *
 * Canonical flow:
 *
 * AniList ID
 *     ↓
 * AniList metadata
 *     ↓
 * Canonical Anime
 *     ↓
 * Episode catalogue
 *
 * Playback is NOT resolved here.
 *
 * MegaPlay playback is handled by:
 *
 * AniList ID + Episode Number + Language
 * =========================================================
 */

router.get(
    '/anime/:anilistId',
    async (req, res) => {
        try {
            const anilistId =
                Number(
                    req.params.anilistId,
                )

            /*
             * ------------------------------------------------
             * 1. Validate AniList ID
             * ------------------------------------------------
             */

            if (
                !Number.isInteger(
                    anilistId,
                ) ||
                anilistId <= 0
            ) {
                return sendError(
                    res,
                    'Invalid AniList anime ID.',
                    ErrorCode.INVALID_ID,
                    400,
                )
            }

            /*
             * ------------------------------------------------
             * 2. Get canonical metadata from AniList
             * ------------------------------------------------
             */

            const aniListAnime =
                await getAnimeById(
                    anilistId,
                )

            /*
             * ------------------------------------------------
             * 3. Normalize status
             * ------------------------------------------------
             */

            let status:
                | 'Airing'
                | 'Completed'
                | 'Upcoming'
                | 'Unknown' =
                'Unknown'

            if (
                aniListAnime.status ===
                'RELEASING'
            ) {
                status =
                    'Airing'
            } else if (
                aniListAnime.status ===
                'FINISHED'
            ) {
                status =
                    'Completed'
            } else if (
                aniListAnime.status ===
                'NOT_YET_RELEASED'
            ) {
                status =
                    'Upcoming'
            }

            /*
             * ------------------------------------------------
             * 4. Normalize rating
             * ------------------------------------------------
             */

            const rating =
                typeof aniListAnime.averageScore ===
                    'number'
                    ? aniListAnime.averageScore /
                    10
                    : undefined

            /*
             * ------------------------------------------------
             * 5. Resolve episode count from AniList
             * ------------------------------------------------
             */

            const totalEpisodes =
                typeof aniListAnime.episodes ===
                    'number' &&
                    Number.isFinite(
                        aniListAnime.episodes,
                    ) &&
                    aniListAnime.episodes > 0
                    ? Math.floor(
                        aniListAnime.episodes,
                    )
                    : undefined

            /*
             * ------------------------------------------------
             * 6. Build canonical episode catalogue
             * ------------------------------------------------
             *
             * No Anikoto data is used here.
             *
             * Each episode is identified by:
             *
             *     AniList ID + episode number
             *
             * MegaPlay playback is resolved separately.
             * ------------------------------------------------
             */

            const episodes:
                UnifiedEpisode[] =
                createEpisodeCatalogue(
                    anilistId,
                    totalEpisodes,
                )

            /*
             * ------------------------------------------------
             * 7. Build unified anime
             * ------------------------------------------------
             */

            const anime:
                UnifiedAnime =
            {
                id:
                    String(
                        aniListAnime.id,
                    ),

                anilistId:
                    aniListAnime.id,

                title:
                    aniListAnime
                        .title
                        .english ??
                    aniListAnime
                        .title
                        .romaji ??
                    aniListAnime
                        .title
                        .native ??
                    `Anime ${aniListAnime.id}`,

                alternativeTitle:
                    aniListAnime
                        .title
                        .romaji ??
                    undefined,

                nativeTitle:
                    aniListAnime
                        .title
                        .native ??
                    undefined,

                poster:
                    aniListAnime
                        .coverImage
                        ?.extraLarge ??
                    aniListAnime
                        .coverImage
                        ?.large ??
                    aniListAnime
                        .coverImage
                        ?.medium ??
                    '',

                cover:
                    aniListAnime
                        .coverImage
                        ?.extraLarge ??
                    aniListAnime
                        .coverImage
                        ?.large ??
                    undefined,

                banner:
                    aniListAnime
                        .bannerImage ??
                    undefined,

                malId:
                    aniListAnime.idMal ??
                    undefined,

                status,

                rating,

                genres:
                    aniListAnime.genres ??
                    [],

                type:
                    aniListAnime.format ??
                    undefined,

                year:
                    aniListAnime.seasonYear ??
                    undefined,

                synopsis:
                    aniListAnime.description ??
                    undefined,

                studio:
                    aniListAnime
                        .studios
                        ?.nodes?.[0]
                        ?.name ??
                    undefined,

                source:
                    aniListAnime.source ??
                    undefined,

                duration:
                    typeof aniListAnime.duration ===
                        'number'
                        ? `${aniListAnime.duration}m`
                        : undefined,

                totalEpisodes,

                availableEpisodes:
                    episodes.length,

                /*
                 * AniList is the canonical source.
                 *
                 * We do not fabricate separate dub
                 * availability from AniList metadata.
                 */
                subEpisodes:
                    episodes.length,

                dubEpisodes:
                    episodes.length,

                episodes,
            }

            /*
             * ------------------------------------------------
             * 8. Return standardized Phase 3 envelope
             * ------------------------------------------------
             */

            const isCached = Boolean((aniListAnime as unknown as Record<string, unknown>)._cached)

            return sendSuccess(
                res,
                anime,
                {
                    cached: isCached,
                },
            )
        } catch (error) {
            console.error(
                '[GET /api/anime/:anilistId]',
                error,
            )

            return sendError(
                res,
                'Unable to load anime data.',
                ErrorCode.SERVICE_UNAVAILABLE,
                502,
            )
        }
    },
)

export default router