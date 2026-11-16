import { type Request, type Response, type NextFunction } from 'express'
import { ErrorCode, sendError } from '../utils/response.js'

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

// Clean up expired IP records every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000).unref?.()

/**
 * Lightweight sliding window rate limiter middleware for sensitive endpoints.
 * @param windowMs Time window in milliseconds (e.g., 60,000ms = 1 min)
 * @param maxMax Allowed requests per window per IP
 */
export function createRateLimiter(windowMs = 60 * 1000, maxRequests = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'
    )
    const key = `${req.path}:${clientIp}`
    const now = Date.now()

    let record = rateLimitMap.get(key)
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs }
      rateLimitMap.set(key, record)
      return next()
    }

    record.count += 1
    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(retryAfterSeconds))

      return sendError(
        res,
        'Too many requests. Please try again later.',
        ErrorCode.TOO_MANY_REQUESTS,
        429,
        { retryAfterSeconds },
      )
    }

    next()
  }
}

/**
 * Escalating cooldown rate limiter specifically for party room join attempts
 * to defend against brute-force code guessing:
 * - 5 attempts -> 5 min cooldown
 * - 10 attempts -> 30 min cooldown
 * - 15+ attempts -> 2 hr cooldown
 */
interface JoinAttemptRecord {
  failures: number
  lockoutUntil: number
}

const partyJoinAttemptMap = new Map<string, JoinAttemptRecord>()

export function partyJoinRateLimiter() {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'
    )
    const key = `party:join:${clientIp}`
    const now = Date.now()

    const record = partyJoinAttemptMap.get(key)
    if (record && now < record.lockoutUntil) {
      const retryAfterSeconds = Math.ceil((record.lockoutUntil - now) / 1000)
      res.setHeader('Retry-After', String(retryAfterSeconds))

      return sendError(
        res,
        'Too many join attempts. Your access is temporarily restricted.',
        ErrorCode.TOO_MANY_REQUESTS,
        429,
        { retryAfterSeconds },
      )
    }

    // Attach failure recorder to response
    res.on('finish', () => {
      if (res.statusCode === 400 || res.statusCode === 404 || res.statusCode === 403) {
        const cur = partyJoinAttemptMap.get(key) || { failures: 0, lockoutUntil: 0 }
        cur.failures += 1
        if (cur.failures >= 15) {
          cur.lockoutUntil = Date.now() + 2 * 60 * 60 * 1000 // 2 hours
        } else if (cur.failures >= 10) {
          cur.lockoutUntil = Date.now() + 30 * 60 * 1000 // 30 mins
        } else if (cur.failures >= 5) {
          cur.lockoutUntil = Date.now() + 5 * 60 * 1000 // 5 mins
        }
        partyJoinAttemptMap.set(key, cur)
      } else if (res.statusCode === 200 || res.statusCode === 201) {
        partyJoinAttemptMap.delete(key) // Reset on success
      }
    })

    next()
  }
}

