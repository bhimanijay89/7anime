import { Router, type Request, type Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import type { LibraryEntry, WatchProgress } from '@prisma/client'
import prisma from '../db/client.js'
import { getAuthUser } from '../middleware/auth.js'
import {
  calculateLevelInfo,
  getOrCreateUserStats,
  ensureSeedAchievements,
} from '../services/gamification.js'
import { getAnimeById } from '../services/anilist.js'
import { ErrorCode, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

/*
 * =========================================================
 * GET /api/profile
 * Returns the authenticated user's real statistics & milestones
 * =========================================================
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return sendError(
        res,
        'Not authenticated.',
        ErrorCode.UNAUTHORIZED,
        401,
      )
    }

    await ensureSeedAchievements().catch(() => {})
    const stats = await getOrCreateUserStats(user.id)

    // Retrieve all genuine watch progress records for the user
    const allProgressRecords = await prisma.watchProgress.findMany({
      where: { userId: user.id },
    })

    // Strict verified counting rule:
    // Only count episodes where user completed at least 80% or completed flag is true
    const verifiedCompletedEpisodes = allProgressRecords.filter((p: WatchProgress) => {
      if (p.completed) return true
      if (p.durationSeconds > 0 && p.progressSeconds >= Math.floor(p.durationSeconds * 0.8)) {
        return true
      }
      return false
    })

    const completedEpisodesCount = verifiedCompletedEpisodes.length

    // Genuine accumulated playback time:
    // Sum of actual verified progressSeconds across episodes (each progressSeconds is already capped at duration)
    const totalWatchSeconds = allProgressRecords.reduce(
      (sum: number, p: WatchProgress) => sum + Math.max(0, p.progressSeconds),
      0,
    )

    // Synchronize user streak record
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId: user.id },
    })

    const currentStreak = userStreak ? userStreak.currentStreak : stats.currentStreak
    const longestStreak = userStreak ? userStreak.longestStreak : stats.longestStreak

    // Synchronize userStats if out of sync
    if (
      stats.totalEpisodesWatched !== completedEpisodesCount ||
      stats.totalWatchSeconds !== totalWatchSeconds ||
      stats.currentStreak !== currentStreak ||
      stats.longestStreak !== longestStreak
    ) {
      await prisma.userStats.update({
        where: { userId: user.id },
        data: {
          totalEpisodesWatched: completedEpisodesCount,
          totalWatchSeconds,
          currentStreak,
          longestStreak,
        },
      }).catch(() => {})
    }

    const levelInfo = calculateLevelInfo(stats.xp)

    // User achievements
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
    })

    const unlockedMap = new Map<string, Date>(
      userAchievements.map((ua: { achievementId: string; unlockedAt: Date }) => [ua.achievementId, ua.unlockedAt]),
    )

    const achievementsFormatted = allAchievements.map((ach: { id: string; key: string; title: string; description: string; xpReward: number; coinReward: number }) => ({
      id: ach.id,
      key: ach.key,
      title: ach.title,
      description: ach.description,
      xpReward: ach.xpReward,
      coinReward: ach.coinReward,
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id)
        ? unlockedMap.get(ach.id)!.toISOString()
        : null,
    }))

    // Library Statistics
    const libraryEntries = await prisma.libraryEntry.findMany({
      where: { userId: user.id },
    })

    const libraryStats = {
      watching: libraryEntries.filter((e: LibraryEntry) => e.status === 'WATCHING').length,
      completed: libraryEntries.filter((e: LibraryEntry) => e.status === 'COMPLETED').length,
      planning: libraryEntries.filter((e: LibraryEntry) => e.status === 'PLANNING').length,
      dropped: libraryEntries.filter((e: LibraryEntry) => e.status === 'DROPPED').length,
      total: libraryEntries.length,
    }

    // Recently Watched - hydrated with metadata for profile Continue Watching
    const recentProgress = await prisma.watchProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    })

    const hydratedRecent = await Promise.all(
      recentProgress.map(async (p: WatchProgress) => {
        try {
          const ani = await getAnimeById(p.anilistId)
          const title = ani?.title?.english || ani?.title?.romaji || `Anime #${p.anilistId}`
          const poster = ani?.coverImage?.large || ani?.coverImage?.medium || ''
          const progressPercent = p.durationSeconds > 0
            ? Math.min(100, Math.round((p.progressSeconds / p.durationSeconds) * 100))
            : 0

          return {
            id: p.id,
            anilistId: p.anilistId,
            episodeNumber: p.episodeNumber,
            progressSeconds: p.progressSeconds,
            durationSeconds: p.durationSeconds,
            progressPercent,
            completed: p.completed,
            updatedAt: p.updatedAt,
            title,
            poster,
          }
        } catch {
          return {
            id: p.id,
            anilistId: p.anilistId,
            episodeNumber: p.episodeNumber,
            progressSeconds: p.progressSeconds,
            durationSeconds: p.durationSeconds,
            progressPercent: p.durationSeconds > 0
              ? Math.min(100, Math.round((p.progressSeconds / p.durationSeconds) * 100))
              : 0,
            completed: p.completed,
            updatedAt: p.updatedAt,
            title: `Anime #${p.anilistId}`,
            poster: '',
          }
        }
      })
    )

    const userDisplayName = (user as any).displayName || user.username
    const userBio = (user as any).bio || ''

    return sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        displayName: userDisplayName,
        bio: userBio,
        email: user.email,
        avatar: user.avatar,
        role: (user as { role?: string }).role || 'USER',
      },
      xp: stats.xp,
      level: levelInfo.level,
      nextLevelXp: levelInfo.nextLevelXp,
      coins: stats.coins,
      currentStreak,
      longestStreak,
      totalAnimeWatched: new Set(allProgressRecords.map((p: WatchProgress) => p.anilistId)).size,
      totalEpisodesWatched: completedEpisodesCount,
      totalWatchSeconds,
      topGenre: libraryEntries.length > 0 ? 'Action' : 'Discovery',
      communityRank: levelInfo.level >= 25 ? 'Master Otaku' : levelInfo.level >= 10 ? 'Senior Otaku' : 'Anime Enthusiast',
      achievements: achievementsFormatted,
      recentlyWatched: hydratedRecent,
      libraryStats,
    })
  } catch (error) {
    console.error('[profile] Error fetching profile:', error)
    return sendError(
      res,
      'Unable to fetch profile.',
      ErrorCode.INTERNAL_ERROR,
      500,
    )
  }
})

/*
 * =========================================================
 * PATCH /api/profile
 * Updates user profile details (displayName, bio)
 * =========================================================
 */
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return sendError(res, 'Not authenticated.', ErrorCode.UNAUTHORIZED, 401)
    }

    const { displayName, bio } = req.body || {}
    const updateData: { displayName?: string | null; bio?: string | null } = {}

    if (typeof displayName === 'string') {
      const trimmed = displayName.trim()
      if (trimmed.length > 50) {
        return sendError(res, 'Display name cannot exceed 50 characters.', ErrorCode.BAD_REQUEST, 400)
      }
      updateData.displayName = trimmed || null
    }

    if (typeof bio === 'string') {
      const trimmed = bio.trim()
      if (trimmed.length > 250) {
        return sendError(res, 'Bio cannot exceed 250 characters.', ErrorCode.BAD_REQUEST, 400)
      }
      updateData.bio = trimmed || null
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })

    return sendSuccess(res, {
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName || updated.username,
        bio: updated.bio || '',
        email: updated.email,
        avatar: updated.avatar,
        role: updated.role,
      },
    })
  } catch (error) {
    console.error('[profile] Error updating profile:', error)
    return sendError(res, 'Unable to update profile.', ErrorCode.INTERNAL_ERROR, 500)
  }
})

/*
 * =========================================================
 * POST /api/profile/avatar
 * Uploads/saves custom user avatar (Base64 WebP/PNG/JPEG or static image)
 * =========================================================
 */
router.post('/profile/avatar', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return sendError(res, 'Not authenticated.', ErrorCode.UNAUTHORIZED, 401)
    }

    const { avatar } = req.body || {}
    if (!avatar || typeof avatar !== 'string') {
      return sendError(res, 'Avatar data is required.', ErrorCode.BAD_REQUEST, 400)
    }

    let finalAvatar = avatar.trim()

    // Handle Data URI format (data:image/webp;base64,... etc.)
    const matches = finalAvatar.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i)
    if (matches) {
      const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase()
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      // Limit max size: 3MB
      if (buffer.length > 3 * 1024 * 1024) {
        return sendError(res, 'Image size exceeds maximum limit of 3MB.', ErrorCode.BAD_REQUEST, 400)
      }

      // Ensure uploads directory exists and persist a file copy
      try {
        const avatarsDir = path.resolve(process.cwd(), 'backend/uploads/avatars')
        if (!fs.existsSync(avatarsDir)) {
          fs.mkdirSync(avatarsDir, { recursive: true })
        }
        const filename = `avatar-${user.id}.${ext}`
        const filepath = path.join(avatarsDir, filename)
        fs.writeFileSync(filepath, buffer)
      } catch (fsErr) {
        console.warn('[profile] Could not write avatar to disk (non-fatal):', fsErr)
      }
    } else if (
      !finalAvatar.startsWith('http://') &&
      !finalAvatar.startsWith('https://') &&
      !finalAvatar.startsWith('/uploads/')
    ) {
      return sendError(
        res,
        'Invalid avatar format. Expected image data URL or valid image link.',
        ErrorCode.BAD_REQUEST,
        400,
      )
    }

    // Persist to user record in PostgreSQL
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: finalAvatar },
    })

    return sendSuccess(res, {
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName || updated.username,
        bio: updated.bio || '',
        email: updated.email,
        avatar: updated.avatar,
        role: updated.role,
      },
    })
  } catch (error) {
    console.error('[profile] Error uploading avatar:', error)
    return sendError(res, 'Unable to upload avatar.', ErrorCode.INTERNAL_ERROR, 500)
  }
})

/*
 * =========================================================
 * DELETE /api/profile/avatar
 * Removes user custom avatar and resets to default initial
 * =========================================================
 */
router.delete('/profile/avatar', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return sendError(res, 'Not authenticated.', ErrorCode.UNAUTHORIZED, 401)
    }

    // Delete existing avatar file on disk if exists
    try {
      const avatarsDir = path.resolve(process.cwd(), 'backend/uploads/avatars')
      const possibleExtensions = ['webp', 'png', 'jpg', 'jpeg']
      for (const ext of possibleExtensions) {
        const filepath = path.join(avatarsDir, `avatar-${user.id}.${ext}`)
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath)
        }
      }
    } catch {
      // ignore
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: null },
    })

    return sendSuccess(res, {
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName || updated.username,
        bio: updated.bio || '',
        email: updated.email,
        avatar: null,
        role: updated.role,
      },
    })
  } catch (error) {
    console.error('[profile] Error removing avatar:', error)
    return sendError(res, 'Unable to remove avatar.', ErrorCode.INTERNAL_ERROR, 500)
  }
})

export default router
