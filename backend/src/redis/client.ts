import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

// Check if Upstash Redis REST credentials are configured
export const isRedisConfigured = Boolean(
    url && url.trim().length > 0 && token && token.trim().length > 0,
)

const globalForRedis = globalThis as unknown as {
    redisClient: Redis | undefined
}

export const redisClient: Redis | null = isRedisConfigured
    ? (globalForRedis.redisClient ??
        new Redis({
            url: url!.trim(),
            token: token!.trim(),
        }))
    : null

if (process.env.NODE_ENV !== 'production' && isRedisConfigured) {
    globalForRedis.redisClient = redisClient ?? undefined
}

/**
 * High-level health check function for Upstash Redis.
 * Returns 'connected' if credentials are configured and ping succeeds,
 * 'disabled' if credentials are not configured, or 'disconnected' if ping fails.
 */
export async function getRedisStatus(): Promise<
    'connected' | 'disconnected' | 'disabled'
> {
    if (!isRedisConfigured || !redisClient) {
        return 'disabled'
    }

    try {
        const pingResponse = await redisClient.ping()
        return pingResponse === 'PONG' ||
            pingResponse === 'OK' ||
            typeof pingResponse === 'string'
            ? 'connected'
            : 'disconnected'
    } catch (err) {
        console.warn(
            '[7anime-api] Upstash Redis health ping failed:',
            err instanceof Error ? err.message : err,
        )
        return 'disconnected'
    }
}

export default redisClient
