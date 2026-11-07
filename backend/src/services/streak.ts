import prisma from '../db/client.js'

export const STREAK_MILESTONES = [
  { days: 3, title: 'Spark of Habit', description: 'Maintained a 3-day watch streak', icon: 'flame-spark', rewardCoins: 50, rewardXp: 100 },
  { days: 7, title: 'Flame of Dedication', description: 'Maintained a 7-day watch streak', icon: 'flame-active', rewardCoins: 100, rewardXp: 250 },
  { days: 14, title: 'Blazing Passion', description: 'Maintained a 14-day watch streak', icon: 'flame-blaze', rewardCoins: 200, rewardXp: 500 },
  { days: 30, title: 'Inferno Legend', description: 'Maintained a 30-day watch streak', icon: 'flame-inferno', rewardCoins: 500, rewardXp: 1000 },
  { days: 50, title: 'Otaku Ascendant', description: 'Maintained a 50-day watch streak', icon: 'flame-ascendant', rewardCoins: 800, rewardXp: 1500 },
  { days: 100, title: 'Centurion of Anime', description: 'Maintained a 100-day watch streak', icon: 'flame-centurion', rewardCoins: 1500, rewardXp: 3000 },
  { days: 365, title: 'Eternal Flame', description: 'Achieved an entire year of daily watch activity!', icon: 'flame-eternal', rewardCoins: 5000, rewardXp: 10000 },
]

export function getLocalDateString(date: Date = new Date(), timeZone = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function getDayDifference(dateStr1: string, dateStr2: string): number {
  const t1 = new Date(`${dateStr1}T00:00:00Z`).getTime()
  const t2 = new Date(`${dateStr2}T00:00:00Z`).getTime()
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24))
}

export function getFlameState(days: number): 'inactive' | 'small' | 'growing' | 'bright' | 'roaring' | 'master' {
  if (days <= 0) return 'inactive'
  if (days <= 2) return 'small'
  if (days <= 6) return 'growing'
  if (days <= 13) return 'bright'
  if (days <= 29) return 'roaring'
  return 'master'
}

export function getMotivationalMessage(days: number, isActiveToday: boolean): string {
  if (days === 0) {
    return 'Start your daily watch ritual today to ignite your streak!'
  }
  if (isActiveToday) {
    if (days === 1) return 'Streak ignited! Come back tomorrow to keep the flame alive.'
    if (days <= 6) return "You're on fire! Daily anime ritual secured for today."
    if (days <= 13) return 'Unstoppable! A whole week of pure passion and counting.'
    if (days <= 29) return 'Blazing bright! Your dedication is reaching legendary status.'
    return 'Eternal Master! An extraordinary anime watching streak.'
  } else {
    if (days === 1) return 'Watch today to keep your streak burning bright!'
    return `Watch today to protect your ${days}-day streak from going cold!`
  }
}

export async function getOrCreateUserStreak(userId: string, clientTimezone?: string) {
  let streak = await prisma.userStreak.findUnique({
    where: { userId },
  })

  const safeTz = clientTimezone && isValidTimezone(clientTimezone) ? clientTimezone : streak?.timezone || 'UTC'

  if (!streak) {
    streak = await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        timezone: safeTz,
      },
    })
  } else if (clientTimezone && isValidTimezone(clientTimezone) && streak.timezone !== clientTimezone) {
    streak = await prisma.userStreak.update({
      where: { userId },
      data: { timezone: clientTimezone },
    })
  }

  // Check if streak is broken (neither today nor yesterday qualified in user timezone)
  const todayStr = getLocalDateString(new Date(), streak.timezone)
  if (streak.lastQualifiedDate && streak.currentStreak > 0) {
    const diff = getDayDifference(streak.lastQualifiedDate, todayStr)
    if (diff > 1) {
      // Missed yesterday and today
      streak = await prisma.userStreak.update({
        where: { userId },
        data: { currentStreak: 0 },
      })

      // Also sync userStats
      await prisma.userStats.updateMany({
        where: { userId },
        data: { currentStreak: 0 },
      }).catch(() => {})
    }
  }

  return streak
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function getUserStreakSummary(userId: string, clientTimezone?: string) {
  const streak = await getOrCreateUserStreak(userId, clientTimezone)
  const todayStr = getLocalDateString(new Date(), streak.timezone)
  const isActiveToday = streak.lastQualifiedDate === todayStr

  // Next milestone calculation
  const nextMilestoneDef = STREAK_MILESTONES.find(m => m.days > streak.currentStreak) || null
  const prevMilestoneDays = [...STREAK_MILESTONES].reverse().find(m => m.days <= streak.currentStreak)?.days || 0

  let milestoneProgressPct = 0
  let remainingDays = 0

  if (nextMilestoneDef) {
    remainingDays = nextMilestoneDef.days - streak.currentStreak
    const span = nextMilestoneDef.days - prevMilestoneDays
    const progressInSpan = streak.currentStreak - prevMilestoneDays
    milestoneProgressPct = Math.min(100, Math.max(0, Math.round((progressInSpan / span) * 100)))
  } else {
    milestoneProgressPct = 100
  }

  // Unlocked milestones
  const unlockedRecords = await prisma.streakMilestone.findMany({
    where: { userId },
    orderBy: { milestone: 'asc' },
  })

  const unlockedSet = new Set(unlockedRecords.map(r => r.milestone))
  const milestones = STREAK_MILESTONES.map(m => ({
    ...m,
    unlocked: unlockedSet.has(m.days),
    unlockedAt: unlockedRecords.find(r => r.milestone === m.days)?.unlockedAt.toISOString() || null,
  }))

  const flameState = getFlameState(streak.currentStreak)
  const motivationalMessage = getMotivationalMessage(streak.currentStreak, isActiveToday)

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalActiveDays: streak.totalActiveDays,
    lastQualifiedDate: streak.lastQualifiedDate,
    timezone: streak.timezone,
    todayDate: todayStr,
    isActiveToday,
    flameState,
    motivationalMessage,
    nextMilestone: nextMilestoneDef
      ? {
          days: nextMilestoneDef.days,
          title: nextMilestoneDef.title,
          description: nextMilestoneDef.description,
          progressPct: milestoneProgressPct,
          remainingDays,
        }
      : null,
    milestones,
  }
}

export async function getUserStreakActivity(
  userId: string,
  options: {
    startDate?: string
    endDate?: string
    daysCount?: number
  } = {}
) {
  const streak = await getOrCreateUserStreak(userId)
  const today = new Date()
  const todayStr = getLocalDateString(today, streak.timezone)

  let startStr = options.startDate
  let endStr = options.endDate || todayStr

  if (!startStr) {
    const count = options.daysCount || 30
    const past = new Date(today)
    past.setDate(past.getDate() - (count - 1))
    startStr = getLocalDateString(past, streak.timezone)
  }

  const activities = await prisma.dailyWatchActivity.findMany({
    where: {
      userId,
      activityDate: {
        gte: startStr,
        lte: endStr,
      },
    },
    orderBy: { activityDate: 'asc' },
  })

  return {
    timezone: streak.timezone,
    todayDate: todayStr,
    startDate: startStr,
    endDate: endStr,
    activities: activities.map(a => ({
      activityDate: a.activityDate,
      qualified: a.qualified,
      qualifyingWatchSeconds: a.qualifyingWatchSeconds,
      completedEpisodes: a.completedEpisodes,
      episodesJson: a.episodesJson,
    })),
  }
}

export interface WatchProgressActivityInput {
  anilistId: number
  episodeNumber: number
  progressSeconds: number
  durationSeconds: number
  completed?: boolean
  timezone?: string
  animeTitle?: string
}

export async function processWatchProgressForStreak(
  userId: string,
  input: WatchProgressActivityInput
) {
  const streak = await getOrCreateUserStreak(userId, input.timezone)
  const activityDate = getLocalDateString(new Date(), streak.timezone)

  const safeDuration = Math.max(0, Math.floor(input.durationSeconds))
  const safeProgress = Math.max(0, Math.min(safeDuration > 0 ? safeDuration : 7200, Math.floor(input.progressSeconds)))

  const isCompleted =
    Boolean(input.completed) ||
    (safeDuration > 0 && safeProgress >= Math.floor(safeDuration * 0.8))

  // Find or create daily watch activity record
  const existingActivity = await prisma.dailyWatchActivity.findUnique({
    where: {
      userId_activityDate: {
        userId,
        activityDate,
      },
    },
  })

  let episodesMap: Record<string, {
    progressSeconds: number
    durationSeconds: number
    completed: boolean
    anilistId?: number
    episodeNumber?: number
    animeTitle?: string
  }> = {}
  if (existingActivity && existingActivity.episodesJson && typeof existingActivity.episodesJson === 'object') {
    episodesMap = existingActivity.episodesJson as typeof episodesMap
  }

  const epKey = `${input.anilistId}:${input.episodeNumber}`
  const prevEpRecord = episodesMap[epKey]

  const prevProgressSeconds = prevEpRecord?.progressSeconds || 0
  const addedSeconds = Math.max(0, safeProgress - prevProgressSeconds)

  const wasPreviouslyCompleted = prevEpRecord?.completed || false
  const nowCompleted = wasPreviouslyCompleted || isCompleted

  episodesMap[epKey] = {
    anilistId: input.anilistId,
    episodeNumber: input.episodeNumber,
    animeTitle: input.animeTitle || prevEpRecord?.animeTitle,
    progressSeconds: Math.max(prevProgressSeconds, safeProgress),
    durationSeconds: safeDuration,
    completed: nowCompleted,
  }

  const completedEpisodesCount = Object.values(episodesMap).filter(e => e.completed).length
  const totalWatchSeconds = (existingActivity?.qualifyingWatchSeconds || 0) + addedSeconds

  const qualifiesNow = completedEpisodesCount >= 1 || totalWatchSeconds >= 1200 // 20 minutes
  const isNewlyQualified = qualifiesNow && (!existingActivity || !existingActivity.qualified)

  // Save daily activity
  const updatedActivity = await prisma.dailyWatchActivity.upsert({
    where: {
      userId_activityDate: {
        userId,
        activityDate,
      },
    },
    update: {
      qualifyingWatchSeconds: totalWatchSeconds,
      completedEpisodes: completedEpisodesCount,
      qualified: qualifiesNow,
      episodesJson: episodesMap,
    },
    create: {
      userId,
      activityDate,
      qualifyingWatchSeconds: totalWatchSeconds,
      completedEpisodes: completedEpisodesCount,
      qualified: qualifiesNow,
      episodesJson: episodesMap,
    },
  })

  let newlyUnlockedMilestone: (typeof STREAK_MILESTONES)[0] | null = null

  // If newly qualified on this local calendar date, calculate and increment streak
  if (isNewlyQualified) {
    let currentStreak = streak.currentStreak
    let longestStreak = streak.longestStreak
    let totalActiveDays = streak.totalActiveDays

    if (!streak.lastQualifiedDate) {
      currentStreak = 1
      longestStreak = Math.max(longestStreak, 1)
      totalActiveDays += 1
    } else {
      const dayDiff = getDayDifference(streak.lastQualifiedDate, activityDate)
      if (dayDiff === 1) {
        // Consecutive calendar day
        currentStreak += 1
        longestStreak = Math.max(longestStreak, currentStreak)
        totalActiveDays += 1
      } else if (dayDiff > 1) {
        // Streak broken
        currentStreak = 1
        totalActiveDays += 1
      }
      // If dayDiff === 0, already handled
    }

    // Update UserStreak
    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak,
        longestStreak,
        totalActiveDays,
        lastQualifiedDate: activityDate,
      },
    })

    // Sync with UserStats
    await prisma.userStats.updateMany({
      where: { userId },
      data: {
        currentStreak,
        longestStreak,
        lastWatchDate: new Date(),
        lastActivityDate: new Date(),
      },
    }).catch(() => {})

    // Check for milestone unlock
    const matchingMilestone = STREAK_MILESTONES.find(m => m.days === currentStreak)
    if (matchingMilestone) {
      const alreadyAwarded = await prisma.streakMilestone.findUnique({
        where: {
          userId_milestone: {
            userId,
            milestone: matchingMilestone.days,
          },
        },
      })

      if (!alreadyAwarded) {
        await prisma.streakMilestone.create({
          data: {
            userId,
            milestone: matchingMilestone.days,
          },
        })

        // Also add coins/XP to userStats
        await prisma.userStats.updateMany({
          where: { userId },
          data: {
            coins: { increment: matchingMilestone.rewardCoins },
            xp: { increment: matchingMilestone.rewardXp },
          },
        }).catch(() => {})

        newlyUnlockedMilestone = matchingMilestone
      }
    }
  }

  return {
    activity: updatedActivity,
    isNewlyQualified,
    newlyUnlockedMilestone,
  }
}
