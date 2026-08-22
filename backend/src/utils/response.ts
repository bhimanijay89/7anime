import type { Request, Response } from 'express'
import type {
    ApiErrorResponse,
    ApiMeta,
    ApiSuccessResponse,
} from '../types.js'

/**
 * Standard error codes catalog for 7anime API.
 */
export const ErrorCode = {
    BAD_REQUEST: 'BAD_REQUEST',
    INVALID_ID: 'INVALID_ID',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    ANIKOTO_NOT_FOUND: 'ANIKOTO_NOT_FOUND',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode] | string

/**
 * Custom application error class for throwing operational errors
 * with HTTP status code and standardized error code.
 */
export class AppError extends Error {
    public readonly isOperational = true

    constructor(
        message: string,
        public readonly code: ErrorCodeType = ErrorCode.BAD_REQUEST,
        public readonly statusCode: number = 400,
        public readonly details?: unknown,
    ) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

/**
 * Sends a standardized success response.
 * Automatically injects ISO timestamp and request ID into response meta.
 */
export function sendSuccess<T>(
    res: Response,
    data: T,
    metaOptions?: Partial<ApiMeta>,
    statusCode = 200,
): Response<ApiSuccessResponse<T>> {
    const req = res.req as Request | undefined
    const requestId = req?.id || 'req_unknown'

    const meta: ApiMeta = {
        timestamp: new Date().toISOString(),
        requestId,
        ...metaOptions,
    }

    const payload: ApiSuccessResponse<T> = {
        ok: true,
        data,
        meta,
    }

    return res.status(statusCode).json(payload)
}

/**
 * Sends a standardized error response.
 * Automatically injects ISO timestamp and request ID into response meta.
 */
export function sendError(
    res: Response,
    message: string,
    code: ErrorCodeType = ErrorCode.BAD_REQUEST,
    statusCode = 400,
    details?: unknown,
    metaOptions?: Partial<ApiMeta>,
): Response<ApiErrorResponse> {
    const req = res.req as Request | undefined
    const requestId = req?.id || 'req_unknown'

    const meta: ApiMeta = {
        timestamp: new Date().toISOString(),
        requestId,
        ...metaOptions,
    }

    const errorPayload: ApiErrorResponse = {
        ok: false,
        error: {
            message,
            code,
            ...(details !== undefined ? { details } : {}),
        },
        meta,
    }

    return res.status(statusCode).json(errorPayload)
}
