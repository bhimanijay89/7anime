import prisma from '../db/client.js'

export function calculateLevelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1
  const prevLevelXp = 100 * Math.pow(level - 1, 2)
  const nextLevelXp = 100 * Math.pow(level, 2)
  const currentXp = xp

  return {
    level,
    currentXp,
    prevLevelXp,
    nextLevelXp,
  }
}

export const SEED_ACHIEVEMENTS = [
  {
    key: 'FIRST_EPISODE',
    title: 'First Step',
    description: 'Watch your first anime episode',
    xpReward: 50,
    coinReward: 25,
  },
  {
    key: 'EPISODES_10',
    title: 'Anime Enthusiast',
    description: 'Watch 10 anime episodes',
    xpReward: 150,
    coinReward: 50,
  },
  {
    key: 'EPISODES_50',
    title: 'Marathon Runner',
    description: 'Watch 50 anime episodes',
    xpReward: 500,
    coinReward: 200,
  },
  {
    key: 'EPISODES_100',
    title: 'Otaku Legend',
    description: 'Watch 100 anime episodes',
    xpReward: 1000,
    coinReward: 500,
  },
  {
    key: 'STREAK_7',
    title: 'Dedicated Streamer',
    description: 'Maintain a 7-day watch streak',
    xpReward: 300,
    coinReward: 100,
  },
  {
    key: 'COLLECTOR_5',
    title: 'Library Curator',
    description: 'Save 5 anime to your library',
    xpReward: 100,
    coinReward: 50,
  },
]

export async function ensureSeedAchievements() {
  for (const item of SEED_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: item.key },
      update: {
        title: item.title,
        description: item.description,
        xpReward: item.xpReward,
        coinReward: item.coinReward,
      },
      create: item,
    })
  }
}

const userStatsSelect = {
  id: true,
  userId: true,
  xp: true,
  level: true,
  coins: true,
  currentStreak: true,
  longestStreak: true,
  totalEpisodesWatched: true,
  totalWatchSeconds: true,
  lastActivityDate: true,
  createdAt: true,
  updatedAt: true,
}

export async function getOrCreateUserStats(userId: string) {
  let stats = await prisma.userStats.findUnique({
    where: { userId },
    select: userStatsSelect,
  })

  if (!stats) {
    stats = await prisma.userStats.create({
      data: {
        userId,
        xp: 0,
        level: 1,
        coins: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalEpisodesWatched: 0,
        totalWatchSeconds: 0,
      },
      select: userStatsSelect,
    })
  }

  // Check if streak reset is needed (last activity older than yesterday)
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (stats.lastActivityDate && stats.currentStreak > 0) {
    const lastAct = new Date(stats.lastActivityDate)
    lastAct.setHours(0, 0, 0, 0)

    if (lastAct < yesterday) {
      stats = await prisma.userStats.update({
        where: { userId },
        data: { currentStreak: 0 },
        select: userStatsSelect,
      })
    }
  }

  // Check if user has watch progress updated today but streak was not recorded
  if (stats.currentStreak === 0) {
    const todayProgressCount = await prisma.watchProgress.count({
      where: {
        userId,
        updatedAt: { gte: today },
      },
    })

    if (todayProgressCount > 0) {
      stats = await prisma.userStats.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(stats.longestStreak, 1),
          lastActivityDate: now,
        },
        select: userStatsSelect,
      })
    }
  }

  return stats
}

export async function recordUserActivity(userId: string, watchTimeDeltaSeconds = 0) {
  const stats = await getOrCreateUserStats(userId)

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  let newCurrentStreak = stats.currentStreak
  let newLongestStreak = stats.longestStreak
  let shouldUpdateStreak = false

  if (!stats.lastActivityDate) {
    newCurrentStreak = 1
    newLongestStreak = 1
    shouldUpdateStreak = true
  } else {
    const lastAct = new Date(stats.lastActivityDate)
    lastAct.setHours(0, 0, 0, 0)

    const diffDays = Math.round((today.getTime() - lastAct.getTime()) / (1000 * 3600 * 24))

    if (diffDays === 1) {
      // Consecutive day activity
      newCurrentStreak += 1
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak)
      shouldUpdateStreak = true
    } else if (diffDays > 1 || diffDays === 0 && newCurrentStreak === 0) {
      // Missed days or first activity today
      newCurrentStreak = 1
      newLongestStreak = Math.max(newLongestStreak, 1)
      shouldUpdateStreak = true
    }
  }

  const updatedStats = await prisma.userStats.update({
    where: { userId },
    data: {
      totalWatchSeconds: { increment: Math.max(0, watchTimeDeltaSeconds) },
      lastActivityDate: now,
      ...(shouldUpdateStreak
        ? { currentStreak: newCurrentStreak, longestStreak: newLongestStreak }
        : {}),
    },
    select: userStatsSelect,
  })

  await checkAndUnlockAchievements(userId)
  return updatedStats
}

export async function awardXpAndCoins(
  userId: string,
  xpAmount: number,
  coinAmount: number,
) {
  const stats = await getOrCreateUserStats(userId)
  const newXp = stats.xp + xpAmount
  const newCoins = stats.coins + coinAmount
  const levelInfo = calculateLevelInfo(newXp)

  const updatedStats = await prisma.userStats.update({
    where: { userId },
    data: {
      xp: newXp,
      level: levelInfo.level,
      coins: newCoins,
    },
    select: userStatsSelect,
  })

  return updatedStats
}

export async function checkAndUnlockAchievements(userId: string) {
  await ensureSeedAchievements()
  const stats = await getOrCreateUserStats(userId)

  const completedEpisodesCount = await prisma.watchProgress.count({
    where: { userId, completed: true },
  })

  const libraryCount = await prisma.libraryEntry.count({
    where: { userId },
  })

  const existingUnlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, achievement: { select: { key: true } } },
  })

  const unlockedKeys = new Set(existingUnlocked.map((a: { achievement: { key: string } }) => a.achievement.key))
  const allAchievements = await prisma.achievement.findMany()

  for (const ach of allAchievements) {
    if (unlockedKeys.has(ach.key)) continue

    let shouldUnlock = false

    if (ach.key === 'FIRST_EPISODE' && completedEpisodesCount >= 1) shouldUnlock = true
    if (ach.key === 'EPISODES_10' && completedEpisodesCount >= 10) shouldUnlock = true
    if (ach.key === 'EPISODES_50' && completedEpisodesCount >= 50) shouldUnlock = true
    if (ach.key === 'EPISODES_100' && completedEpisodesCount >= 100) shouldUnlock = true
    if (ach.key === 'STREAK_7' && stats.currentStreak >= 7) shouldUnlock = true
    if (ach.key === 'COLLECTOR_5' && libraryCount >= 5) shouldUnlock = true

    if (shouldUnlock) {
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: ach.id,
        },
      })

      await awardXpAndCoins(userId, ach.xpReward, ach.coinReward)
    }
  }
}
