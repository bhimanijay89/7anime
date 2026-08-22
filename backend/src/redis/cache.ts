import { isRedisConfigured, redisClient } from './client.js'

/** Default TTL for anime metadata in seconds (24 hours) */
export const ANIME_CACHE_TTL = 86400

/**
 * Returns the canonical cache key for an AniList anime ID.
 * Key format: anime:anilist:{id}
 */
export function getAnimeCacheKey(id: string | number): string {
    return `anime:anilist:${id}`
}

/**
 * High-level Upstash Redis cache utility abstraction with safe graceful fallbacks.
 * If Redis is unconfigured or unavailable, operations return fallback values
 * (null/false) instead of throwing exceptions.
 */
export const cache = {
    /**
     * Retrieve parsed JSON or string value from cache by key.
     * Returns null if key does not exist, if Redis is unconfigured, or if Redis fails.
     */
    async get<T = unknown>(key: string): Promise<T | null> {
        if (!isRedisConfigured || !redisClient) {
            return null
        }

        try {
            const data = await redisClient.get<T>(key)
            return data ?? null
        } catch (error) {
            console.warn(
                `[7anime-api] Cache GET failed for key "${key}":`,
                error instanceof Error ? error.message : error,
            )
            return null
        }
    },

    /**
     * Store key-value pair in cache.
     * Optionally accepts TTL (time-to-live) in seconds.
     * Automatically handles JSON serialization if value is an object.
     * Returns true if successfully stored, false otherwise.
     */
    async set(
        key: string,
        value: unknown,
        ttlSeconds: number = ANIME_CACHE_TTL,
    ): Promise<boolean> {
        if (!isRedisConfigured || !redisClient) {
            return false
        }

        try {
            if (ttlSeconds && ttlSeconds > 0) {
                await redisClient.set(key, value, {
                    ex: ttlSeconds,
                })
            } else {
                await redisClient.set(key, value)
            }
            return true
        } catch (error) {
            console.warn(
                `[7anime-api] Cache SET failed for key "${key}":`,
                error instanceof Error ? error.message : error,
            )
            return false
        }
    },

    /**
     * Delete key from cache.
     * Returns true if key was deleted, false otherwise.
     */
    async delete(key: string): Promise<boolean> {
        if (!isRedisConfigured || !redisClient) {
            return false
        }

        try {
            const deletedCount = await redisClient.del(key)
            return deletedCount > 0
        } catch (error) {
            console.warn(
                `[7anime-api] Cache DELETE failed for key "${key}":`,
                error instanceof Error ? error.message : error,
            )
            return false
        }
    },

    /**
     * Check whether key exists in cache.
     * Returns true if key exists, false otherwise.
     */
    async exists(key: string): Promise<boolean> {
        if (!isRedisConfigured || !redisClient) {
            return false
        }

        try {
            const existsCount = await redisClient.exists(key)
            return existsCount > 0
        } catch (error) {
            console.warn(
                `[7anime-api] Cache EXISTS failed for key "${key}":`,
                error instanceof Error ? error.message : error,
            )
            return false
        }
    },
}

export default cache
