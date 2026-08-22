import { Router, type Response } from 'express'
import prisma from '../db/client.js'
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js'
import { checkAndUnlockAchievements } from '../services/gamification.js'
import {
  ErrorCode,
  sendError,
  sendSuccess,
} from '../utils/response.js'
import type { LibraryStatus } from '@prisma/client'

const router = Router()

/* =========================================================
   GET /api/library

   Fetch the authenticated user's library.
   IMPORTANT:
   userId always comes from the authenticated session.
   A client cannot request another user's library.
========================================================= */

router.get(
  '/library',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user!.id

      const entries =
        await prisma.libraryEntry.findMany({
          where: {
            userId,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })

      return sendSuccess(res, {
        library: entries,
      })
    } catch (error) {
      console.error(
        '[library] Fetch error:',
        error,
      )

      return sendError(
        res,
        'Unable to fetch library.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)


/* =========================================================
   POST /api/library

   Add or update an anime in the authenticated user's library.

   Body:
   {
     "anilistId": 21,
     "status": "WATCHING"
   }

   Supported statuses:
   WATCHING
   COMPLETED
   PLANNING
   DROPPED
========================================================= */

router.post(
  '/library',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user!.id

      const {
        anilistId,
        status,
      } = req.body as {
        anilistId?: unknown
        status?: unknown
      }

      /* -------------------------------------------------------
         Validate AniList ID
      ------------------------------------------------------- */

      const numericId = Number(anilistId)

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
        return sendError(
          res,
          'Invalid anime ID.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      /* -------------------------------------------------------
         Validate library status
      ------------------------------------------------------- */

      const validStatuses: LibraryStatus[] = [
        'WATCHING',
        'COMPLETED',
        'PLANNING',
        'DROPPED',
      ]

      const targetStatus: LibraryStatus =
        typeof status === 'string' &&
          validStatuses.includes(
            status as LibraryStatus,
          )
          ? (status as LibraryStatus)
          : 'WATCHING'

      /* -------------------------------------------------------
         Upsert

         Because Prisma schema has:

         @@unique([userId, anilistId])

         the same anime cannot be duplicated for
         the same user.

         Different users can still save the same anime.
      ------------------------------------------------------- */

      const entry =
        await prisma.libraryEntry.upsert({
          where: {
            userId_anilistId: {
              userId,
              anilistId: numericId,
            },
          },

          update: {
            status: targetStatus,
          },

          create: {
            userId,
            anilistId: numericId,
            status: targetStatus,
          },
        })

      /* -------------------------------------------------------
         Achievement checks

         Do not fail the library request if achievement
         processing has an unrelated problem.
      ------------------------------------------------------- */

      await checkAndUnlockAchievements(
        userId,
      ).catch(error => {
        console.error(
          '[library] Achievement check failed:',
          error,
        )
      })

      return sendSuccess(res, {
        entry,
      })
    } catch (error) {
      console.error(
        '[library] Add/Update error:',
        error,
      )

      return sendError(
        res,
        'Unable to update library entry.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)


/* =========================================================
   DELETE /api/library/:anilistId

   Remove an anime ONLY from the authenticated user's
   library.

   Example:
   DELETE /api/library/21
========================================================= */

router.delete(
  '/library/:anilistId',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user!.id

      const numericId =
        Number(req.params.anilistId)

      /* -------------------------------------------------------
         Validate AniList ID
      ------------------------------------------------------- */

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
        return sendError(
          res,
          'Invalid anime ID.',
          ErrorCode.BAD_REQUEST,
          400,
        )
      }

      /* -------------------------------------------------------
         Delete only the current user's entry.

         This is VERY important for data isolation.
         User A can never delete User B's library entry.
      ------------------------------------------------------- */

      await prisma.libraryEntry.deleteMany({
        where: {
          userId,
          anilistId: numericId,
        },
      })

      return sendSuccess(res, {
        message:
          'Removed from library.',
      })
    } catch (error) {
      console.error(
        '[library] Delete error:',
        error,
      )

      return sendError(
        res,
        'Unable to remove library entry.',
        ErrorCode.INTERNAL_ERROR,
        500,
      )
    }
  },
)


export default router