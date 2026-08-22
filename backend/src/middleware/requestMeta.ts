/* eslint-disable @typescript-eslint/no-namespace */
import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

declare global {
    namespace Express {
        interface Request {
            id: string
            startedAt: number
        }
    }
}

const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/

/**
 * Express middleware to attach a sanitized/validated request ID and start timestamp
 * to each incoming HTTP request context.
 */
export function requestMetaMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const rawHeader = req.header('X-Request-ID')
    let requestId: string

    if (rawHeader && REQUEST_ID_REGEX.test(rawHeader.trim())) {
        requestId = rawHeader.trim()
    } else {
        requestId = `req_${crypto.randomUUID()}`
    }

    req.id = requestId
    req.startedAt = Date.now()

    res.setHeader('X-Request-ID', requestId)

    next()
}

export default requestMetaMiddleware
