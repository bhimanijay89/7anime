import { cache } from '../redis/cache.js'
import {
    getAiringSchedule,
    getTrendingAnime,
    getPopularAnime,
    getUpcomingAnime,
    isCooldownActive,
    getCooldownRemainingMs,
} from './anilist.js'

interface CacheWarmerHealth {
    lastScheduleRefresh: number | null
    lastTrendingRefresh: number | null
    lastPopularRefresh: number | null
    lastUpcomingRefresh: number | null
    cooldownActive: boolean
    cooldownRemainingMs: number
}

const healthStats: CacheWarmerHealth = {
    lastScheduleRefresh: null,
    lastTrendingRefresh: null,
    lastPopularRefresh: null,
    lastUpcomingRefresh: null,
    cooldownActive: false,
    cooldownRemainingMs: 0,
}

export function getCacheHealthDiagnostics(): CacheWarmerHealth {
    return {
        ...healthStats,
        cooldownActive: isCooldownActive(),
        cooldownRemainingMs: getCooldownRemainingMs(),
    }
}

let warmerTimer: NodeJS.Timeout | null = null
let isWarmingCycleRunning = false

export async function warmSchedule(): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    const airingAtGreater = now - (3 * 86400)
    const airingAtLesser = now + (7 * 86400)
    const page = 1
    const perPage = 50

    const freshCacheKey = `anime:schedule:${airingAtGreater}:${airingAtLesser}:${page}:${perPage}`

    const freshCached = await cache.get<unknown[]>(freshCacheKey)
    if (freshCached && freshCached.length > 0) {
        console.log(`[7anime-api] WARMER_SKIP_FRESH dataset="schedule" key="${freshCacheKey}"`)
        healthStats.lastScheduleRefresh = Date.now()
        return
    }

    console.log(`[7anime-api] WARMER_UPSTREAM_START dataset="schedule" key="${freshCacheKey}"`)
    try {
        const items = await getAiringSchedule(airingAtGreater, airingAtLesser, page, perPage)
        if (items && items.length > 0) {
            healthStats.lastScheduleRefresh = Date.now()
            console.log(`[7anime-api] WARMER_UPSTREAM_SUCCESS dataset="schedule" items=${items.length}`)
        }
    } catch (err) {
        console.warn(`[7anime-api] WARMER_UPSTREAM_FAILURE dataset="schedule" error=`, err instanceof Error ? err.message : err)
    }
}

export async function warmTrending(): Promise<void> {
    const page = 1
    const perPage = 20
    const freshCacheKey = `anime:list:trending:${page}:${perPage}`

    const freshCached = await cache.get<unknown[]>(freshCacheKey)
    if (freshCached && freshCached.length > 0) {
        console.log(`[7anime-api] WARMER_SKIP_FRESH dataset="trending" key="${freshCacheKey}"`)
        healthStats.lastTrendingRefresh = Date.now()
        return
    }

    console.log(`[7anime-api] WARMER_UPSTREAM_START dataset="trending" key="${freshCacheKey}"`)
    try {
        const items = await getTrendingAnime(page, perPage)
        if (items && items.length > 0) {
            healthStats.lastTrendingRefresh = Date.now()
            console.log(`[7anime-api] WARMER_UPSTREAM_SUCCESS dataset="trending" items=${items.length}`)
        }
    } catch (err) {
        console.warn(`[7anime-api] WARMER_UPSTREAM_FAILURE dataset="trending" error=`, err instanceof Error ? err.message : err)
    }
}

export async function warmPopular(): Promise<void> {
    const page = 1
    const perPage = 20
    const freshCacheKey = `anime:list:popular:${page}:${perPage}`

    const freshCached = await cache.get<unknown[]>(freshCacheKey)
    if (freshCached && freshCached.length > 0) {
        console.log(`[7anime-api] WARMER_SKIP_FRESH dataset="popular" key="${freshCacheKey}"`)
        healthStats.lastPopularRefresh = Date.now()
        return
    }

    console.log(`[7anime-api] WARMER_UPSTREAM_START dataset="popular" key="${freshCacheKey}"`)
    try {
        const items = await getPopularAnime(page, perPage)
        if (items && items.length > 0) {
            healthStats.lastPopularRefresh = Date.now()
            console.log(`[7anime-api] WARMER_UPSTREAM_SUCCESS dataset="popular" items=${items.length}`)
        }
    } catch (err) {
        console.warn(`[7anime-api] WARMER_UPSTREAM_FAILURE dataset="popular" error=`, err instanceof Error ? err.message : err)
    }
}

export async function warmUpcoming(): Promise<void> {
    const page = 1
    const perPage = 20
    const freshCacheKey = `anime:list:upcoming:${page}:${perPage}`

    const freshCached = await cache.get<unknown[]>(freshCacheKey)
    if (freshCached && freshCached.length > 0) {
        console.log(`[7anime-api] WARMER_SKIP_FRESH dataset="upcoming" key="${freshCacheKey}"`)
        healthStats.lastUpcomingRefresh = Date.now()
        return
    }

    console.log(`[7anime-api] WARMER_UPSTREAM_START dataset="upcoming" key="${freshCacheKey}"`)
    try {
        const items = await getUpcomingAnime(page, perPage)
        if (items && items.length > 0) {
            healthStats.lastUpcomingRefresh = Date.now()
            console.log(`[7anime-api] WARMER_UPSTREAM_SUCCESS dataset="upcoming" items=${items.length}`)
        }
    } catch (err) {
        console.warn(`[7anime-api] WARMER_UPSTREAM_FAILURE dataset="upcoming" error=`, err instanceof Error ? err.message : err)
    }
}

export async function runWarmingCycle(): Promise<void> {
    if (isWarmingCycleRunning) {
        console.log(`[7anime-api] WARMER_SKIP_RUNNING Cycle already in progress`)
        return
    }

    isWarmingCycleRunning = true
    console.log(`[7anime-api] WARMER_START Initiating proactive cache warming cycle`)

    try {
        await warmSchedule()
        await new Promise((resolve) => setTimeout(resolve, 500))

        await warmTrending()
        await new Promise((resolve) => setTimeout(resolve, 500))

        await warmPopular()
        await new Promise((resolve) => setTimeout(resolve, 500))

        await warmUpcoming()
    } finally {
        isWarmingCycleRunning = false
        console.log(`[7anime-api] WARMER_COMPLETE Cache warming cycle finished`)
    }
}

export function startCacheWarmer(): void {
    if (warmerTimer) {
        return
    }

    void runWarmingCycle()

    warmerTimer = setInterval(() => {
        void runWarmingCycle()
    }, 600_000)

    console.log(`[7anime-api] Cache warmer scheduled (interval: 10m)`)
}

export function stopCacheWarmer(): void {
    if (warmerTimer) {
        clearInterval(warmerTimer)
        warmerTimer = null
        console.log(`[7anime-api] Cache warmer stopped`)
    }
}
