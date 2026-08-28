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
