import { Router, type Response } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { ErrorCode, sendError, sendSuccess } from '../utils/response.js'
import {
  getUserStreakSummary,
  getUserStreakActivity,
  processWatchProgressForStreak,
  getOrCreateUserStreak,
} from '../services/streak.js'
import prisma from '../db/client.js'

const router = Router()

/*
 * GET /api/streak
 * Returns the authenticated user's current streak statistics,
 * next achievement milestone, flame state, and motivational quote.
 */
router.get(
  '/streak',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const clientTz = (req.headers['x-timezone'] as string) || (req.query.timezone as string) || undefined

      const summary = await getUserStreakSummary(userId, clientTz)
      return sendSuccess(res, summary)
    } catch (error) {
      console.error('[streak] Get summary error:', error)
      return sendError(
        res,
        'Unable to fetch watch streak data.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

/*
 * GET /api/streak/activity
 * Returns the authenticated user's daily activity records for the calendar view.
 */
router.get(
  '/streak/activity',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      let startDate = req.query.startDate as string | undefined
      let endDate = req.query.endDate as string | undefined
      const month = req.query.month as string | undefined // Format: YYYY-MM
      const daysCount = req.query.days ? Number(req.query.days) : undefined

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [yearStr, monthStr] = month.split('-')
        const year = parseInt(yearStr, 10)
        const monthNum = parseInt(monthStr, 10)
        startDate = `${month}-01`
        const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
        endDate = `${month}-${String(lastDay).padStart(2, '0')}`
      }

      const activity = await getUserStreakActivity(userId, {
        startDate,
        endDate,
        daysCount: startDate ? undefined : (daysCount || 35),
      })

      return sendSuccess(res, activity)
    } catch (error) {
      console.error('[streak] Get activity error:', error)
      return sendError(
        res,
        'Unable to fetch activity records.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

/*
 * POST /api/streak/timezone
 * Updates the user's preferred timezone.
 */
router.post(
  '/streak/timezone',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const { timezone } = req.body as { timezone?: unknown }

      if (typeof timezone !== 'string' || !timezone.trim()) {
        return sendError(
          res,
          'Valid timezone string is required.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone })
      } catch {
        return sendError(
          res,
          'Invalid IANA timezone string.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      const updated = await prisma.userStreak.upsert({
        where: { userId },
        update: { timezone },
        create: {
          userId,
          timezone,
          currentStreak: 0,
          longestStreak: 0,
          totalActiveDays: 0,
        },
      })

      return sendSuccess(res, { timezone: updated.timezone })
    } catch (error) {
      console.error('[streak] Update timezone error:', error)
      return sendError(
        res,
        'Unable to update timezone.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

/*
 * POST /api/streak/ping
 * Allows frontend to report qualifying playback event explicitly.
 */
router.post(
  '/streak/ping',
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
        timezone,
      } = req.body as {
        anilistId?: unknown
        episodeNumber?: unknown
        progressSeconds?: unknown
        durationSeconds?: unknown
        completed?: unknown
        timezone?: unknown
      }

      const numericAnimeId = Number(anilistId)
      const numericEpisode = Number(episodeNumber || 1)
      const numericProgress = Number(progressSeconds || 0)
      const numericDuration = Number(durationSeconds || 0)
      const isCompleted = Boolean(completed)
      const clientTz = typeof timezone === 'string' ? timezone : (req.headers['x-timezone'] as string) || undefined

      if (!Number.isInteger(numericAnimeId) || numericAnimeId <= 0) {
        return sendError(
          res,
          'Valid anime ID is required.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      const result = await processWatchProgressForStreak(userId, {
        anilistId: numericAnimeId,
        episodeNumber: numericEpisode,
        progressSeconds: numericProgress,
        durationSeconds: numericDuration,
        completed: isCompleted,
        timezone: clientTz,
      })

      return sendSuccess(res, result)
    } catch (error) {
      console.error('[streak] Ping error:', error)
      return sendError(
        res,
        'Unable to process streak ping.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)

export default router
