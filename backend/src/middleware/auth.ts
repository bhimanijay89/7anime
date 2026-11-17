import { type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import prisma from '../db/client.js'
import { cache } from '../redis/cache.js'
import { ErrorCode, sendError } from '../utils/response.js'
import type { User } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user?: User
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Session cache TTL in seconds (3 minutes) */
const SESSION_CACHE_TTL = 180

export function getSessionCacheKey(tokenHash: string): string {
  return `session:${tokenHash}`
}

export async function invalidateSessionCache(tokenHash: string): Promise<void> {
  try {
    await cache.delete(getSessionCacheKey(tokenHash))
  } catch {
    // Non-fatal if Redis is unavailable
  }
}

export function getSessionToken(req: Request): string | null {
  const authorization = req.headers.authorization
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim()
  }

  const cookieHeader = req.headers.cookie
  if (cookieHeader) {
    const cookieToken = cookieHeader
      .split(';')
      .map(v => v.trim())
      .find(v => v.startsWith('sevenanime_session='))

    if (cookieToken) {
      return cookieToken.split('=').slice(1).join('=')
    }
  }

  return null
}

export async function getAuthUser(req: Request): Promise<User | null> {
  const token = getSessionToken(req)
  if (!token) return null

  const tokenHash = hashToken(token)
  const cacheKey = getSessionCacheKey(tokenHash)

  // Tier 1: Check Redis cache (conservative 3-minute TTL to reduce database query volume)
  try {
    const cachedUser = await cache.get<User>(cacheKey)
    if (cachedUser) {
      return cachedUser
    }
  } catch {
    // Safe fallback to database on Redis error
  }

  // Tier 2: Query database with column selection
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: true,
    },
  })

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    }
    await invalidateSessionCache(tokenHash)
    return null
  }

  // Populate Redis session cache with conservative short TTL
  const remainingSeconds = Math.max(
    1,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
  )
  const ttl = Math.min(SESSION_CACHE_TTL, remainingSeconds)

  void cache.set(cacheKey, session.user, ttl)

  return session.user
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return sendError(
        res,
        'Authentication required.',
        ErrorCode.UNAUTHORIZED,
        401,
      )
    }
    req.user = user
    next()
  } catch (error) {
    console.error('[auth-middleware] Error:', error)
    return sendError(
      res,
      'Authentication failed.',
      ErrorCode.UNAUTHORIZED,
      401,
    )
  }
}
