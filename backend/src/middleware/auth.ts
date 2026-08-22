import { type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import prisma from '../db/client.js'
import { ErrorCode, sendError } from '../utils/response.js'
import type { User } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user?: User
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
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
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    }
    return null
  }

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
