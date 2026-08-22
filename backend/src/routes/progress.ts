import { Router, type Response } from 'express'
import prisma from '../db/client.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { ErrorCode, sendError, sendSuccess } from '../utils/response.js'
import { recordUserActivity } from '../services/gamification.js'

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

      const allProgress = await prisma.watchProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
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

      return sendSuccess(res, { progress })
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

      const shouldComplete =
        isCompleted ||
        (safeDuration > 0 && safeProgress >= Math.floor(safeDuration * 0.9))

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
      })

      // Record activity to maintain watch streak and total time
      await recordUserActivity(userId, safeProgress).catch(() => {})

      return sendSuccess(res, { progress: entry })
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
