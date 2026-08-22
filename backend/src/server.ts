import 'dotenv/config'

import cors from 'cors'
import express, {
    type ErrorRequestHandler,
    type Request,
    type Response,
} from 'express'

import animeRouter from './routes/anime.js'
import authRouter from './routes/auth.js'
import profileRouter from './routes/profile.js'
import libraryRouter from './routes/library.js'
import progressRouter from './routes/progress.js'
import prisma from './db/client.js'
import { getRedisStatus } from './redis/client.js'
import { requestMetaMiddleware } from './middleware/requestMeta.js'
import {
    AppError,
    ErrorCode,
    sendError,
    sendSuccess,
} from './utils/response.js'

const app = express()

const PORT = Number(
    process.env.PORT || 3001,
)

const HOST =
    process.env.HOST ||
    'localhost'

/*
 * =========================================================
 * Middleware
 * =========================================================
 */

app.use(requestMetaMiddleware)

app.use(
    cors({
        origin: true,
        credentials: true,
    }),
)

app.use(
    express.json({
        limit: '1mb',
    }),
)

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb',
    }),
)

/*
 * =========================================================
 * Request logger
 * =========================================================
 */

app.use(
    (
        req: Request,
        res: Response,
        next,
    ) => {
        const startedAt =
            req.startedAt || Date.now()

        console.log(
            `[7anime-api] [${req.id}] ${req.method} ${req.originalUrl}`,
        )

        res.on(
            'finish',
            () => {
                const duration =
                    Date.now() -
                    startedAt

                console.log(
                    `[7anime-api] [${req.id}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`,
                )
            },
        )

        next()
    },
)

/*
 * =========================================================
 * Health
 * =========================================================
 */

app.get(
    '/api/health',
    async (
        _req,
        res,
    ) => {
        let dbStatus = 'disconnected'
        try {
            await prisma.$queryRaw`SELECT 1`
            dbStatus = 'connected'
        } catch (error) {
            console.error('[7anime-api] Database health check failed:', error)
        }

        const redisStatus = await getRedisStatus()

        return sendSuccess(res, {
            service: '7anime-api',
            status: dbStatus === 'connected' ? 'healthy' : 'degraded',
            database: dbStatus,
            redis: redisStatus,
        })
    },
)

/*
 * =========================================================
 * API root
 * =========================================================
 */

app.get(
    '/api',
    (
        _req,
        res,
    ) => {
        return sendSuccess(res, {
            service: '7anime-api',
            version: '0.1.0',
            message: '7anime backend is running.',
        })
    },
)

/*
 * =========================================================
 * Router diagnostics
 * =========================================================
 */

console.log(
    '[7anime-api] Anime router loaded:',
    Boolean(animeRouter),
)

/*
 * =========================================================
 * API Routes
 * =========================================================
 */

app.use('/api', animeRouter)
app.use('/api', authRouter)
app.use('/api', profileRouter)
app.use('/api', libraryRouter)
app.use('/api', progressRouter)

console.log(
    '[7anime-api] All core API routers (anime, auth, profile, library, progress) mounted at /api',
)

/*
 * =========================================================
 * Router diagnostic endpoint
 * =========================================================
 */

app.get(
    '/api/anime-test',
    (
        _req,
        res,
    ) => {
        return sendSuccess(res, {
            route: '/api/anime-test',
            message: 'Anime route namespace is working.',
        })
    },
)

/*
 * =========================================================
 * 404
 * =========================================================
 */

app.use(
    (
        _req,
        res,
    ) => {
        sendError(
            res,
            'Route not found',
            ErrorCode.NOT_FOUND,
            404,
        )
    },
)

/*
 * =========================================================
 * Error handler
 * =========================================================
 */

const errorHandler:
    ErrorRequestHandler = (
        error,
        _req,
        res,
        _next,
    ) => {
        void _next
        console.error(
            '[7anime-api] Unhandled error:',
            error,
        )

        if (
            res.headersSent
        ) {
            return
        }

        if (
            error instanceof AppError
        ) {
            sendError(
                res,
                error.message,
                error.code,
                error.statusCode,
                error.details,
            )
            return
        }

        sendError(
            res,
            'Internal server error',
            ErrorCode.INTERNAL_ERROR,
            500,
        )
    }

app.use(
    errorHandler,
)

app.listen(
    PORT,
    HOST,
    () => {
        console.log('')
        console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        )
        console.log(
            '        7anime Backend API',
        )
        console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        )
        console.log(
            `Server: http://${HOST}:${PORT}`,
        )
        console.log(
            `Health: http://${HOST}:${PORT}/api/health`,
        )
        console.log(
            `Anime:  http://${HOST}:${PORT}/api/anime/:anilistId`,
        )
        console.log(
            `Test:   http://${HOST}:${PORT}/api/anime-test`,
        )
        console.log(
            'Status: READY',
        )
        console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        )
        console.log('')
    },
)