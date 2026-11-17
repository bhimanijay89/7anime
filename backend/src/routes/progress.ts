import { Router, type Response } from 'express'
import type { WatchProgress } from '@prisma/client'
import prisma from '../db/client.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { ErrorCode, sendError, sendSuccess } from '../utils/response.js'
import { recordUserActivity } from '../services/gamification.js'
import { processWatchProgressForStreak } from '../services/streak.js'
import { getAnimeById } from '../services/anilist.js'
import { mapAniListToUnified } from './anime.js'

const router = Router()

/*
 * GET /api/progress
 *
 * Returns the authenticated user's watch progress, newest first.
 * Deduplicates by anilistId — only the most recently updated episode
 * per anime is returned so Continue Watching shows a single card per
 * anime representing the user's current/latest position.
 */
router.get(
  '/progress',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50))
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
      const skip = (page - 1) * limit

      const allProgress = await prisma.watchProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          userId: true,
          anilistId: true,
          episodeNumber: true,
          progressSeconds: true,
          durationSeconds: true,
          completed: true,
          updatedAt: true,
        },
      })

      // Deduplicate: keep only the latest episode per anime (anilistId).
      // Records are already sorted by updatedAt desc, so the first
      // occurrence of each anilistId is the most recent.
      const seen = new Set<number>()
      const progress = allProgress.filter((entry) => {
        if (seen.has(entry.anilistId)) return false
        seen.add(entry.anilistId)
        return true
      })

      // Hydrate each progress entry with anime details to eliminate client N+1 queries.
      // Handled in parallel with safe try-catch so progress records never fail if upstream is down.
      const hydratedProgress = await Promise.all(
        progress.map(async (entry) => {
          try {
            const aniListAnime = await getAnimeById(entry.anilistId)
            const anime = mapAniListToUnified(aniListAnime)
            return {
              ...entry,
              anime,
            }
          } catch (err) {
            console.warn(`[progress] Failed to hydrate anime ${entry.anilistId}:`, err)
            return {
              ...entry,
              anime: null,
            }
          }
        })
      )

      return sendSuccess(res, { progress: hydratedProgress })
    } catch (error) {
      console.error('[progress] Fetch error:', error)
      return sendError(
        res,
        'Unable to fetch watch progress.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

/*
 * GET /api/progress/:anilistId/:episodeNumber
 *
 * Lightweight single-episode watch progress lookup.
 * Directly utilizes @@unique([userId, anilistId, episodeNumber]) index with zero external hydration.
 */
router.get(
  '/progress/:anilistId/:episodeNumber',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const anilistId = Number(req.params.anilistId)
      const episodeNumber = Number(req.params.episodeNumber)

      if (
        !Number.isInteger(anilistId) ||
        anilistId <= 0 ||
        !Number.isInteger(episodeNumber) ||
        episodeNumber <= 0
      ) {
        return sendError(
          res,
          'Invalid anime or episode ID.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      const progress = await prisma.watchProgress.findUnique({
        where: {
          userId_anilistId_episodeNumber: {
            userId,
            anilistId,
            episodeNumber,
          },
        },
        select: {
          anilistId: true,
          episodeNumber: true,
          progressSeconds: true,
          durationSeconds: true,
          completed: true,
          updatedAt: true,
        },
      })

      return sendSuccess(res, { progress })
    } catch (error) {
      console.error('[progress] Single episode fetch error:', error)
      return sendError(
        res,
        'Unable to fetch episode progress.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

/*
 * GET /api/progress/:anilistId
 *
 * Returns the most recent watch progress record for a given anime.
 */
router.get(
  '/progress/:anilistId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const anilistId = Number(req.params.anilistId)

      if (!Number.isInteger(anilistId) || anilistId <= 0) {
        return sendError(
          res,
          'Invalid anime ID.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      const progress = await prisma.watchProgress.findFirst({
        where: { userId, anilistId },
        orderBy: { updatedAt: 'desc' },
        select: {
          anilistId: true,
          episodeNumber: true,
          progressSeconds: true,
          durationSeconds: true,
          completed: true,
          updatedAt: true,
        },
      })

      return sendSuccess(res, { progress })
    } catch (error) {
      console.error('[progress] Anime progress fetch error:', error)
      return sendError(
        res,
        'Unable to fetch anime progress.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

/*
 * POST /api/progress
 *
 * Creates or updates one anime episode's progress for the
 * authenticated user.
 */
router.post(
  '/progress',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const {
        anilistId,
        episodeNumber,
        progressSeconds,
        durationSeconds,
        completed,
      } = req.body as {
        anilistId?: unknown
        episodeNumber?: unknown
        progressSeconds?: unknown
        durationSeconds?: unknown
        completed?: unknown
      }

      const numericAnimeId = Number(anilistId)
      const numericEpisode = Number(episodeNumber)
      const numericProgress = Number(progressSeconds ?? 0)
      const numericDuration = Number(durationSeconds ?? 0)
      const isCompleted = Boolean(completed)

      if (
        !Number.isInteger(numericAnimeId) ||
        numericAnimeId <= 0 ||
        !Number.isInteger(numericEpisode) ||
        numericEpisode <= 0
      ) {
        return sendError(
          res,
          'Invalid anime or episode ID.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      if (
        !Number.isFinite(numericProgress) ||
        numericProgress < 0 ||
        !Number.isFinite(numericDuration) ||
        numericDuration < 0
      ) {
        return sendError(
          res,
          'Invalid progress values.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      const safeDuration = Math.floor(numericDuration)
      const safeProgress = Math.min(
        Math.floor(numericProgress),
        safeDuration > 0 ? safeDuration : Math.floor(numericProgress),
      )

      const existingEntry = await prisma.watchProgress.findUnique({
        where: {
          userId_anilistId_episodeNumber: {
            userId,
            anilistId: numericAnimeId,
            episodeNumber: numericEpisode,
          },
        },
        select: {
          id: true,
          progressSeconds: true,
          durationSeconds: true,
          completed: true,
          updatedAt: true,
        },
      })

      // Multi-tab / out-of-order write protection:
      // If the incoming request has a clientTimestamp that is significantly older than the database updatedAt,
      // and the existing progress is ahead, ignore the stale write (unless marking completed).
      const clientTimestamp = Number(req.body?.clientTimestamp)
      if (
        existingEntry &&
        Number.isFinite(clientTimestamp) &&
        clientTimestamp > 0 &&
        existingEntry.updatedAt.getTime() - clientTimestamp > 2500 &&
        safeProgress < existingEntry.progressSeconds &&
        !isCompleted
      ) {
        return sendSuccess(res, {
          progress: existingEntry,
          staleIgnored: true,
        })
      }

      // Preserve completed state: seeking backwards on an already completed episode must not uncomplete it
      const shouldComplete =
        isCompleted ||
        Boolean(existingEntry?.completed) ||
        (safeDuration > 0 && safeProgress >= Math.floor(safeDuration * 0.9))

      const prevProgress = existingEntry ? existingEntry.progressSeconds : 0
      // Incremental delta watched (max 180s to accommodate 75s checkpoints plus network retries, while guarding against massive seeking inflation)
      const deltaSeconds = Math.min(180, Math.max(0, safeProgress - prevProgress))

      // If duplicate progress with no meaningful delta and same completion state, return existing record
      if (
        existingEntry &&
        deltaSeconds === 0 &&
        existingEntry.progressSeconds === safeProgress &&
        existingEntry.completed === shouldComplete &&
        (safeDuration === 0 || existingEntry.durationSeconds === safeDuration)
      ) {
        return sendSuccess(res, {
          progress: existingEntry,
          duplicateIgnored: true,
        })
      }

      const entry = await prisma.watchProgress.upsert({
        where: {
          userId_anilistId_episodeNumber: {
            userId,
            anilistId: numericAnimeId,
            episodeNumber: numericEpisode,
          },
        },
        update: {
          progressSeconds: safeProgress,
          durationSeconds: safeDuration,
          completed: shouldComplete,
        },
        create: {
          userId,
          anilistId: numericAnimeId,
          episodeNumber: numericEpisode,
          progressSeconds: safeProgress,
          durationSeconds: safeDuration,
          completed: shouldComplete,
        },
        select: {
          id: true,
          userId: true,
          anilistId: true,
          episodeNumber: true,
          progressSeconds: true,
          durationSeconds: true,
          completed: true,
          updatedAt: true,
        },
      })

      // Decoupled streak & gamification calculation:
      // Only execute multi-table streak and userStats updates when watch time was actually gained or episode completed.
      let streakResult = null
      if (deltaSeconds > 0 || shouldComplete) {
        const clientTz = (req.headers['x-timezone'] as string) || (req.body?.timezone as string) || undefined
        const animeTitle = (req.body?.animeTitle as string) || (req.body?.title as string) || undefined
        streakResult = await processWatchProgressForStreak(userId, {
          anilistId: numericAnimeId,
          episodeNumber: numericEpisode,
          progressSeconds: safeProgress,
          durationSeconds: safeDuration,
          completed: shouldComplete,
          timezone: clientTz,
          animeTitle,
        }).catch((err) => {
          console.warn('[progress] Streak processing error:', err)
          return null
        })

        await recordUserActivity(userId, deltaSeconds).catch(() => {})
      }

      return sendSuccess(res, {
        progress: entry,
        streak: streakResult ? {
          isNewlyQualified: streakResult.isNewlyQualified,
          newlyUnlockedMilestone: streakResult.newlyUnlockedMilestone,
        } : null,
      })
    } catch (error) {
      console.error('[progress] Save error:', error)
      return sendError(
        res,
        'Unable to save watch progress.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

export default router
