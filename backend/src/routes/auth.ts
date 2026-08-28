import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { google } from 'googleapis'

import prisma from '../db/client.js'
import {
    ErrorCode,
    sendError,
    sendSuccess,
} from '../utils/response.js'
import { createRateLimiter } from '../middleware/rateLimit.js'

const router = Router()
const authLimiter = createRateLimiter(60 * 1000, 15)


const SESSION_DAYS = 30

function hashToken(token: string): string {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex')
}

function createSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

function getSessionToken(req: Request): string | null {
    const authorization = req.headers.authorization

    if (
        authorization &&
        authorization.startsWith('Bearer ')
    ) {
        return authorization.slice(7).trim()
    }

    const cookieHeader = req.headers.cookie

    if (cookieHeader) {
        const cookieToken = cookieHeader
            .split(';')
            .map(value => value.trim())
            .find(value =>
                value.startsWith('sevenanime_session='),
            )

        if (cookieToken) {
            return cookieToken
                .split('=')
                .slice(1)
                .join('=')
        }
    }

    return null
}

function sanitizeUser(user: {
    id: string
    email: string
    username: string
    avatar: string | null
    role?: string
    createdAt: Date
    updatedAt: Date
}) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role || 'USER',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/*
 * =========================================================
 * REGISTER
 * =========================================================
 */

router.post(
    '/auth/register',
    authLimiter,
    async (req: Request, res: Response) => {
        try {
            const {
                email,
                username,
                password,
            } = req.body as {
                email?: unknown
                username?: unknown
                password?: unknown
            }

            if (
                typeof email !== 'string' ||
                typeof username !== 'string' ||
                typeof password !== 'string'
            ) {
                return sendError(
                    res,
                    'Email, username and password are required.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const normalizedEmail =
                email.trim().toLowerCase()

            const normalizedUsername =
                username.trim()

            if (
                !isValidEmail(
                    normalizedEmail,
                )
            ) {
                return sendError(
                    res,
                    'Please provide a valid email address.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            if (
                normalizedUsername.length < 3 ||
                normalizedUsername.length > 30
            ) {
                return sendError(
                    res,
                    'Username must be between 3 and 30 characters.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            if (
                !/^[a-zA-Z0-9_]+$/.test(
                    normalizedUsername,
                )
            ) {
                return sendError(
                    res,
                    'Username can only contain letters, numbers and underscores.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            if (password.length < 8) {
                return sendError(
                    res,
                    'Password must be at least 8 characters.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const existingUser =
                await prisma.user.findFirst({
                    where: {
                        OR: [
                            {
                                email:
                                    normalizedEmail,
                            },
                            {
                                username:
                                    normalizedUsername,
                            },
                        ],
                    },
                })

            if (existingUser) {
                return sendError(
                    res,
                    existingUser.email ===
                        normalizedEmail
                        ? 'Email is already registered.'
                        : 'Username is already taken.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12,
                )

            const user =
                await prisma.user.create({
                    data: {
                        email:
                            normalizedEmail,
                        username:
                            normalizedUsername,
                        passwordHash,
                        role: 'USER',
                    },
                })

            const {
                getOrCreateUserStats,
                ensureSeedAchievements,
            } = await import(
                '../services/gamification.js'
            )

            await ensureSeedAchievements().catch(
                () => { },
            )

            await getOrCreateUserStats(
                user.id,
            ).catch(() => { })

            const sessionToken =
                createSessionToken()

            const tokenHash =
                hashToken(
                    sessionToken,
                )

            const expiresAt =
                new Date(
                    Date.now() +
                    SESSION_DAYS *
                    24 *
                    60 *
                    60 *
                    1000,
                )

            await prisma.session.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                },
            })

            res.setHeader(
                'Set-Cookie',
                `sevenanime_session=${sessionToken}; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
            )

            return sendSuccess(
                res,
                {
                    user:
                        sanitizeUser(
                            user,
                        ),
                    token: sessionToken,
                    expiresAt,
                },
            )
        } catch (error) {
            console.error(
                '[auth] Register error:',
                error,
            )

            return sendError(
                res,
                'Unable to create account.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

/*
 * =========================================================
 * LOGIN
 * =========================================================
 */

router.post(
    '/auth/login',
    authLimiter,
    async (req: Request, res: Response) => {
        try {
            const {
                email,
                password,
            } = req.body as {
                email?: unknown
                password?: unknown
            }

            if (
                typeof email !== 'string' ||
                typeof password !== 'string'
            ) {
                return sendError(
                    res,
                    'Email and password are required.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const normalizedEmail =
                email.trim().toLowerCase()

            const user =
                await prisma.user.findUnique({
                    where: {
                        email:
                            normalizedEmail,
                    },
                })

            if (!user) {
                return sendError(
                    res,
                    'Invalid email or password.',
                    ErrorCode.UNAUTHORIZED,
                    401,
                )
            }

            const passwordValid =
                await bcrypt.compare(
                    password,
                    user.passwordHash,
                )

            if (!passwordValid) {
                return sendError(
                    res,
                    'Invalid email or password.',
                    ErrorCode.UNAUTHORIZED,
                    401,
                )
            }

            const sessionToken =
                createSessionToken()

            const tokenHash =
                hashToken(
                    sessionToken,
                )

            const expiresAt =
                new Date(
                    Date.now() +
                    SESSION_DAYS *
                    24 *
                    60 *
                    60 *
                    1000,
                )

            await prisma.session.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                },
            })

            res.setHeader(
                'Set-Cookie',
                `sevenanime_session=${sessionToken}; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
            )

            return sendSuccess(
                res,
                {
                    user:
                        sanitizeUser(
                            user,
                        ),
                    token: sessionToken,
                    expiresAt,
                },
            )
        } catch (error) {
            console.error(
                '[auth] Login error:',
                error,
            )

            return sendError(
                res,
                'Unable to log in.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

/*
 * =========================================================
 * CURRENT USER
 * =========================================================
 */

router.get(
    '/auth/me',
    async (req: Request, res: Response) => {
        try {
            const token =
                getSessionToken(req)

            if (!token) {
                return sendError(
                    res,
                    'Not authenticated.',
                    ErrorCode.UNAUTHORIZED,
                    401,
                )
            }

            const tokenHash =
                hashToken(token)

            const session =
                await prisma.session.findUnique({
                    where: {
                        tokenHash,
                    },
                    include: {
                        user: true,
                    },
                })

            if (
                !session ||
                session.expiresAt <=
                new Date()
            ) {
                if (session) {
                    await prisma.session.delete({
                        where: {
                            id: session.id,
                        },
                    })
                }

                return sendError(
                    res,
                    'Session expired or invalid.',
                    ErrorCode.UNAUTHORIZED,
                    401,
                )
            }

            return sendSuccess(
                res,
                {
                    user:
                        sanitizeUser(
                            session.user,
                        ),
                },
            )
        } catch (error) {
            console.error(
                '[auth] Me error:',
                error,
            )

            return sendError(
                res,
                'Unable to retrieve session.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

/*
 * =========================================================
 * LOGOUT
 * =========================================================
 */

router.post(
    '/auth/logout',
    async (req: Request, res: Response) => {
        try {
            const token =
                getSessionToken(req)

            if (token) {
                const tokenHash =
                    hashToken(token)

                await prisma.session.deleteMany({
                    where: {
                        tokenHash,
                    },
                })
            }

            res.setHeader(
                'Set-Cookie',
                'sevenanime_session=; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=0',
            )

            return sendSuccess(
                res,
                {
                    message:
                        'Logged out successfully.',
                },
            )
        } catch (error) {
            console.error(
                '[auth] Logout error:',
                error,
            )

            return sendError(
                res,
                'Unable to log out.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

/*
 * =========================================================
 * FORGOT PASSWORD
 * =========================================================
 */

router.post(
    '/auth/forgot-password',
    authLimiter,
    async (req: Request, res: Response) => {
        try {
            const { email } =
                req.body as {
                    email?: unknown
                }

            if (
                typeof email !== 'string' ||
                !isValidEmail(
                    email
                        .trim()
                        .toLowerCase(),
                )
            ) {
                return sendError(
                    res,
                    'Please provide a valid email address.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const normalizedEmail =
                email.trim().toLowerCase()

            const genericSuccess =
                'If an account exists for this email, a verification code has been sent.'

            console.log(`[auth/forgot-password] Request received for email: ${normalizedEmail}`)

            const user =
                await prisma.user.findUnique({
                    where: {
                        email:
                            normalizedEmail,
                    },
                })

            console.log(`[auth/forgot-password] User lookup: email=${normalizedEmail}, userExists=${Boolean(user)}`)

            if (!user) {
                console.warn(`[auth/forgot-password] User not found in database for email ${normalizedEmail}. Returning generic success without calling mailer.`)
                return sendSuccess(
                    res,
                    {
                        message:
                            genericSuccess,
                    },
                )
            }

            const existingCodes =
                await prisma.passwordResetCode.findMany(
                    {
                        where: {
                            userId: user.id,
                        },
                        orderBy: {
                            createdAt:
                                'desc',
                        },
                        take: 1,
                    },
                )

            if (
                existingCodes.length > 0
            ) {
                const recent =
                    existingCodes[0]

                const secondsSinceLast =
                    (Date.now() -
                        recent.createdAt.getTime()) /
                    1000

                if (
                    secondsSinceLast < 60
                ) {
                    console.warn(`[auth/forgot-password] Rate limit hit: Code requested ${Math.round(secondsSinceLast)}s ago (<60s) for ${user.email}. Returning generic success without sending duplicate email.`)
                    return sendSuccess(
                        res,
                        {
                            message:
                                genericSuccess,
                        },
                    )
                }
            }

            await prisma.passwordResetCode.deleteMany(
                {
                    where: {
                        userId: user.id,
                    },
                },
            )

            const code =
                crypto
                    .randomInt(
                        100000,
                        1000000,
                    )
                    .toString()

            const codeHash =
                await bcrypt.hash(
                    code,
                    10,
                )

            const expiresAt =
                new Date(
                    Date.now() +
                    10 * 60 * 1000,
                )

            const dbRecord = await prisma.passwordResetCode.create(
                {
                    data: {
                        userId:
                            user.id,
                        codeHash,
                        expiresAt,
                    },
                },
            )

            console.log(`[auth/forgot-password] Inserted PasswordResetCode row in DB. Row ID: ${dbRecord.id}`)

            const {
                sendPasswordResetEmail,
            } = await import(
                '../utils/mailer.js'
            )

            console.log(`[auth/forgot-password] Calling sendPasswordResetEmail for ${user.email}...`)

            const mailResult =
                await sendPasswordResetEmail(
                    user.email,
                    code,
                )

            console.log(`[auth/forgot-password] Mailer Result: success=${mailResult.success}, MessageID=${mailResult.messageId || 'NONE'}, SMTP_Response="${mailResult.response || 'NONE'}"`)

            if (!mailResult.success) {
                console.error(
                    `[auth/forgot-password] Email dispatch failed for ${user.email}:`,
                    mailResult.errorCode,
                    mailResult.error,
                )

                await prisma.passwordResetCode.deleteMany({
                    where: {
                        userId: user.id,
                    },
                }).catch(() => {})

                return sendError(
                    res,
                    mailResult.error ||
                        'Failed to send verification email. Please check server email configuration.',
                    ErrorCode.INTERNAL_ERROR,
                    500,
                )
            }

            return sendSuccess(
                res,
                {
                    message:
                        genericSuccess,
                },
            )
        } catch (error) {
            console.error(
                '[auth] Forgot password error:',
                error,
            )

            return sendError(
                res,
                'Unable to process password reset request.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

/*
 * =========================================================
 * VERIFY RESET CODE (OTP)
 * =========================================================
 */

router.post(
    '/auth/verify-reset-code',
    authLimiter,
    async (req: Request, res: Response) => {
        try {
            const {
                email,
                code,
            } = req.body as {
                email?: unknown
                code?: unknown
            }

            if (
                typeof email !== 'string' ||
                typeof code !== 'string'
            ) {
                return sendError(
                    res,
                    'Email and 6-digit verification code are required.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const normalizedEmail =
                email.trim().toLowerCase()

            const cleanCode =
                code.trim()

            if (
                !/^\d{6}$/.test(
                    cleanCode,
                )
            ) {
                return sendError(
                    res,
                    'Verification code must be a 6-digit number.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const user =
                await prisma.user.findUnique({
                    where: {
                        email:
                            normalizedEmail,
                    },
                })

            if (!user) {
                return sendError(
                    res,
                    'Invalid or expired verification code.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const record =
                await prisma.passwordResetCode.findFirst(
                    {
                        where: {
                            userId:
                                user.id,
                            expiresAt: {
                                gt: new Date(),
                            },
                            verifiedAt:
                                null,
                        },
                        orderBy: {
                            createdAt:
                                'desc',
                        },
                    },
                )

            if (!record) {
                return sendError(
                    res,
                    'Invalid or expired verification code.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            if (
                record.attempts >= 5
            ) {
                await prisma.passwordResetCode.delete(
                    {
                        where: {
                            id: record.id,
                        },
                    },
                )

                return sendError(
                    res,
                    'Too many failed attempts. Please request a new verification code.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            await prisma.passwordResetCode.update(
                {
                    where: {
                        id: record.id,
                    },
                    data: {
                        attempts: {
                            increment: 1,
                        },
                    },
                },
            )

            const isMatch =
                await bcrypt.compare(
                    cleanCode,
                    record.codeHash,
                )

            if (!isMatch) {
                return sendError(
                    res,
                    'Invalid verification code.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const resetToken =
                crypto.randomBytes(32)
                    .toString('hex')

            const resetTokenHash =
                hashToken(
                    resetToken,
                )

            const resetExpiresAt =
                new Date(
                    Date.now() +
                    15 * 60 * 1000,
                )

            await prisma.passwordResetCode.update(
                {
                    where: {
                        id: record.id,
                    },
                    data: {
                        verifiedAt:
                            new Date(),
                        resetTokenHash,
                        resetExpiresAt,
                    },
                },
            )

            return sendSuccess(
                res,
                {
                    token:
                        resetToken,
                    message:
                        'Verification code confirmed. You may now reset your password.',
                },
            )
        } catch (error) {
            console.error(
                '[auth] Verify reset code error:',
                error,
            )

            return sendError(
                res,
                'Unable to verify reset code.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

/*
 * =========================================================
 * RESET PASSWORD
 * =========================================================
 */

router.post(
    '/auth/reset-password',
    authLimiter,
    async (req: Request, res: Response) => {
        try {
            const {
                token,
                password,
            } = req.body as {
                token?: unknown
                password?: unknown
            }

            if (
                typeof token !== 'string' ||
                typeof password !== 'string'
            ) {
                return sendError(
                    res,
                    'Reset token and new password are required.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            if (password.length < 8) {
                return sendError(
                    res,
                    'New password must be at least 8 characters long.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const resetTokenHash =
                hashToken(token)

            const record =
                await prisma.passwordResetCode.findFirst(
                    {
                        where: {
                            resetTokenHash,
                            resetExpiresAt: {
                                gt: new Date(),
                            },
                            verifiedAt: {
                                not: null,
                            },
                        },
                    },
                )

            if (!record) {
                return sendError(
                    res,
                    'Invalid or expired password reset token. Please request a new verification code.',
                    ErrorCode.BAD_REQUEST,
                    400,
                )
            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12,
                )

            await prisma.user.update({
                where: {
                    id: record.userId,
                },
                data: {
                    passwordHash,
                },
            })

            await prisma.session.deleteMany({
                where: {
                    userId:
                        record.userId,
                },
            })

            await prisma.passwordResetCode.delete(
                {
                    where: {
                        id: record.id,
                    },
                },
            )

            return sendSuccess(
                res,
                {
                    message:
                        'Password updated successfully. Please sign in with your new password.',
                },
            )
        } catch (error) {
            console.error(
                '[auth] Reset password error:',
                error,
            )

            return sendError(
                res,
                'Unable to reset password.',
                ErrorCode.INTERNAL_ERROR,
                500,
            )
        }
    },
)

// GET /api/auth/google/status - Diagnostic endpoint for OAuth route presence
router.get('/auth/google/status', (_req, res) => {
    return sendSuccess(res, {
        gmailOAuthRoutes: true,
        version: '34a532c',
        configured: Boolean(
            process.env.GOOGLE_CLIENT_ID &&
                process.env.GOOGLE_CLIENT_SECRET,
        ),
    })
})

// GET /api/auth/google/url - Generate Google OAuth 2.0 authorization URL for Gmail API
router.get('/auth/google/url', (_req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        (process.env.NODE_ENV === 'production'
            ? 'https://sevenanime-vodw.onrender.com/api/auth/google/callback'
            : 'http://localhost:3001/api/auth/google/callback')

    if (!clientId || !clientSecret) {
        return res.status(400).json({
            error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in environment variables.',
        })
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
    )

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/gmail.send'],
    })

    return res.redirect(authUrl)
})

// GET /api/auth/google/callback - Handle OAuth 2.0 callback and exchange code for refresh token
router.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code as string | undefined

    if (!code) {
        return res
            .status(400)
            .send(
                '<h1>Authorization Failed</h1><p>Missing code query parameter from Google OAuth redirect.</p>',
            )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        (process.env.NODE_ENV === 'production'
            ? 'https://sevenanime-vodw.onrender.com/api/auth/google/callback'
            : 'http://localhost:3001/api/auth/google/callback')

    if (!clientId || !clientSecret) {
        return res
            .status(500)
            .send(
                '<h1>OAuth Configuration Error</h1><p>GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing on the server.</p>',
            )
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri,
        )
        const { tokens } = await oauth2Client.getToken(code)

        console.log('[Gmail OAuth] Successfully exchanged code for tokens!')
        console.log('[Gmail OAuth] Refresh Token Present:', Boolean(tokens.refresh_token))

        if (!tokens.refresh_token) {
            return res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; background: #05070d; color: #fff;">
            <h1 style="color: #f87171;">OAuth Warning: No Refresh Token Received</h1>
            <p>Google did not return a <code>refresh_token</code> because consent was previously granted.</p>
            <p>Please revoke access for this app in your Google Account Security settings, or visit <a href="/api/auth/google/url" style="color: #38bdf8;">/api/auth/google/url</a> again (prompt=consent).</p>
          </body>
        </html>
      `)
        }

        // Securely display only the refresh token on screen for one-time admin copying into Render environment secrets
        return res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; background: #05070d; color: #fff; max-width: 650px; margin: 0 auto;">
          <h1 style="color: #4ade80;">✅ Gmail OAuth 2.0 Authorized Successfully!</h1>
          <p>Your one-time <code>GMAIL_REFRESH_TOKEN</code> has been generated below.</p>
          <div style="background: #0f131f; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; word-break: break-all;">
            <p style="margin: 0 0 10px 0; color: #38bdf8; font-weight: bold;">GMAIL_REFRESH_TOKEN:</p>
            <code style="background: #090d16; color: #38bdf8; padding: 8px 12px; border-radius: 6px; display: block; font-size: 14px;">${tokens.refresh_token}</code>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">Copy this token and save it as <code>GMAIL_REFRESH_TOKEN</code> in your Render Dashboard environment settings.</p>
        </body>
      </html>
    `)
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('[Gmail OAuth] Token exchange error:', errorMsg)
        return res
            .status(500)
            .send(`<h1>OAuth Authorization Error</h1><p>${errorMsg}</p>`)
    }
})

export default router