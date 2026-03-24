import type { Context, Hono, ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError, ErrorCode, isAppError, parseDbError } from '@errors/index'
import { env } from '@config/environment'
import { Sentry } from '@config/sentry'
import { CONDOMINIUM_ID_PROP } from './auth'
import { AUTHENTICATED_USER_PROP } from './utils/auth/is-user-authenticated'

/**
 * Global error handler for Hono.
 * Uses Hono's onError hook to catch all errors and convert them to consistent JSON responses.
 */
export const globalErrorHandler: ErrorHandler = (error, c) => {
  return handleError(c, error)
}

/**
 * Handles an error and returns an appropriate JSON response.
 */
function handleError(c: Context, error: unknown): Response {
  // Log the error for debugging
  console.error('[Error Handler]', error)

  // Report to Sentry (skip expected 4xx errors)
  if (!isAppError(error) || (isAppError(error) && error.statusCode >= 500)) {
    const user = c.get(AUTHENTICATED_USER_PROP) as
      | { id: string; email?: string; managementCompanyId?: string }
      | undefined
    const condominiumId = c.get(CONDOMINIUM_ID_PROP) as string | undefined

    Sentry.withScope(scope => {
      if (user) {
        scope.setUser({ id: user.id, email: user.email })
        scope.setTag('userId', user.id)
        if (user.managementCompanyId) {
          scope.setTag('managementCompanyId', user.managementCompanyId)
        }
      }
      if (condominiumId) {
        scope.setTag('condominiumId', condominiumId)
      }
      Sentry.captureException(error)
    })
  }

  // If it's already an AppError, use it directly
  if (isAppError(error)) {
    return formatErrorResponse(c, error)
  }

  // Try to parse database errors
  const parsedError = parseDbError(error)
  if (parsedError.code !== ErrorCode.INTERNAL_ERROR) {
    return formatErrorResponse(c, parsedError)
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase()

    // Validation errors from Zod or similar
    if (error.name === 'ZodError' || message.includes('validation')) {
      const appError = AppError.validation(error.message)
      return formatErrorResponse(c, appError)
    }

    // In development, include the original error message
    if (env.NODE_ENV === 'development') {
      const appError = AppError.internal(error.message)
      return formatErrorResponse(c, appError)
    }
  }

  // Fallback to generic internal error
  const internalError = AppError.internal()
  return formatErrorResponse(c, internalError)
}

/**
 * Formats an AppError into a JSON response.
 */
function formatErrorResponse(c: Context, error: AppError): Response {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  }

  // Include details in development or if they exist
  if (error.details && Object.keys(error.details).length > 0) {
    response.error.details = error.details
  }

  return c.json(response, error.statusCode as ContentfulStatusCode)
}

/**
 * Error response structure.
 */
interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Helper function to apply the error handler to a Hono app.
 * Uses Hono's onError hook for proper error catching.
 */
export function applyErrorHandler(app: Hono) {
  app.onError(globalErrorHandler)
}
