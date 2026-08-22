import { Router, type Request, type Response } from 'express'
import prisma from '../db/client.js'
import { getAuthUser } from '../middleware/auth.js'
import {
  calculateLevelInfo,
  getOrCreateUserStats,
  ensureSeedAchievements,
} from '../services/gamification.js'
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

    const completedEpisodesCount = await prisma.watchProgress.count({
      where: { userId: user.id },
    })

    const watchProgressSum = await prisma.watchProgress.aggregate({
      where: { userId: user.id },
      _sum: { progressSeconds: true },
    })

    const totalWatchSeconds = Math.max(
      stats.totalWatchSeconds,
      watchProgressSum._sum.progressSeconds || 0,
    )

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
      watching: libraryEntries.filter(e => e.status === 'WATCHING').length,
      completed: libraryEntries.filter(e => e.status === 'COMPLETED').length,
      planning: libraryEntries.filter(e => e.status === 'PLANNING').length,
      dropped: libraryEntries.filter(e => e.status === 'DROPPED').length,
      total: libraryEntries.length,
    }

    // Recently Watched
    const recentProgress = await prisma.watchProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    return sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: (user as { role?: string }).role || 'USER',
      },
      xp: stats.xp,
      level: levelInfo.level,
      nextLevelXp: levelInfo.nextLevelXp,
      coins: stats.coins,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalEpisodesWatched: completedEpisodesCount,
      totalWatchSeconds,
      topGenre: libraryEntries.length > 0 ? 'Action' : 'Discovery',
      achievements: achievementsFormatted,
      recentlyWatched: recentProgress,
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

export default router
