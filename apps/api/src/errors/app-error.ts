/**
 * Error codes for the application.
 * Used to categorize errors and provide consistent error handling.
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Database errors
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
}

/**
 * HTTP status codes mapped to error codes.
 */
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.DUPLICATE_KEY]: 409,
  [ErrorCode.FOREIGN_KEY_VIOLATION]: 400,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.RATE_LIMITED]: 429,
}

/**
 * Custom application error class.
 * Provides structured error information for consistent error handling.
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly isOperational: boolean

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode ?? ERROR_STATUS_CODES[code]
    this.details = details
    this.isOperational = true

    // Maintains proper stack trace for where the error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Creates a NOT_FOUND error.
   */
  static notFound(resource: string, id?: string): AppError {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    return new AppError(ErrorCode.NOT_FOUND, message, { resource, id })
  }

  /**
   * Creates an ALREADY_EXISTS error.
   */
  static alreadyExists(resource: string, field?: string): AppError {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`
    return new AppError(ErrorCode.ALREADY_EXISTS, message, { resource, field })
  }

  /**
   * Creates a CONFLICT error.
   */
  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.CONFLICT, message, details)
  }

  /**
   * Creates a DUPLICATE_KEY error from database constraint violation.
   */
  static duplicateKey(field: string, value?: string): AppError {
    const message = value
      ? `A record with ${field} '${value}' already exists`
      : `A record with this ${field} already exists`
    return new AppError(ErrorCode.DUPLICATE_KEY, message, { field, value })
  }

  /**
   * Creates a FOREIGN_KEY_VIOLATION error.
   */
  static foreignKeyViolation(reference: string): AppError {
    return new AppError(ErrorCode.FOREIGN_KEY_VIOLATION, `Invalid reference to ${reference}`, {
      reference,
    })
  }

  /**
   * Creates a VALIDATION_ERROR.
   */
  static validation(message: string, errors?: Record<string, string[]>): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, { errors })
  }

  /**
   * Creates an UNAUTHORIZED error.
   */
  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message)
  }

  /**
   * Creates a FORBIDDEN error.
   */
  static forbidden(message = 'Access denied'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message)
  }

  /**
   * Creates a TOKEN_EXPIRED error.
   */
  static tokenExpired(): AppError {
    return new AppError(ErrorCode.TOKEN_EXPIRED, 'Token has expired')
  }

  /**
   * Creates an INVALID_TOKEN error.
   */
  static invalidToken(): AppError {
    return new AppError(ErrorCode.INVALID_TOKEN, 'Invalid token')
  }

  /**
   * Creates an INTERNAL_ERROR.
   */
  static internal(message = 'An unexpected error occurred'): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message)
  }

  /**
   * Creates a SERVICE_UNAVAILABLE error.
   */
  static serviceUnavailable(service?: string): AppError {
    const message = service
      ? `${service} is currently unavailable`
      : 'Service is currently unavailable'
    return new AppError(ErrorCode.SERVICE_UNAVAILABLE, message, { service })
  }

  /**
   * Creates a RATE_LIMITED error.
   */
  static rateLimited(retryAfter?: number): AppError {
    return new AppError(ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.', {
      retryAfter,
    })
  }

  /**
   * Creates a DATABASE_ERROR.
   */
  static database(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.DATABASE_ERROR, message, details)
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }
}

/**
 * Type guard to check if an error is an AppError.
 * Uses duck-typing to avoid instanceof issues across module boundaries.
 */
export function isAppError(error: unknown): error is AppError {
  if (error instanceof AppError) {
    return true
  }
  // Duck-typing fallback for cross-module compatibility
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'AppError' &&
    'code' in error &&
    'statusCode' in error &&
    'isOperational' in error
  ) {
    return true
  }
  return false
}

/**
 * PostgreSQL error codes.
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
} as const

/**
 * Extracts a field name from a PostgreSQL error detail string.
 * e.g. 'Key (email)=(test@test.com) already exists.' → 'email'
 */
function extractFieldFromDetail(detail?: string): string | null {
  if (!detail) return null
  const match = detail.match(/Key \(([^)]+)\)=/)
  return match?.[1] ?? null
}

/**
 * Parses database errors and converts them to AppError.
 * Handles PostgreSQL error codes (from pg/drizzle) and message-based patterns.
 */
export function parseDbError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  // Handle PostgreSQL-style errors (have a numeric `code` property like "23505")
  const pgError = error as { code?: string; message?: string; detail?: string } | null
  const pgCode = pgError?.code
  const detail = pgError?.detail

  if (pgCode === PG_CODES.UNIQUE_VIOLATION) {
    const field = extractFieldFromDetail(detail) ?? 'field'
    return AppError.duplicateKey(field)
  }

  if (pgCode === PG_CODES.FOREIGN_KEY_VIOLATION) {
    const refMatch = detail?.match(/referenced by table "([^"]+)"/) ??
      (pgError?.message?.match(/referenced by table "([^"]+)"/) || null)
    const reference = refMatch?.[1] ?? 'related resource'
    return AppError.foreignKeyViolation(reference)
  }

  if (pgCode === PG_CODES.NOT_NULL_VIOLATION) {
    return AppError.validation('Required field is missing')
  }

  if (pgCode === PG_CODES.CHECK_VIOLATION) {
    return AppError.validation('Data validation failed')
  }

  // Fallback: message-based pattern matching for non-pg errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      const field = extractFieldFromDetail((error as { detail?: string }).detail)
        ?? error.message.match(/Key \(([^)]+)\)=/)?.[1]
        ?? 'field'
      return AppError.duplicateKey(field)
    }

    if (message.includes('foreign key') || message.includes('violates foreign key')) {
      const refMatch = error.message.match(/referenced by table "([^"]+)"/)
      const reference = refMatch?.[1] ?? 'related resource'
      return AppError.foreignKeyViolation(reference)
    }

    if (message.includes('not-null constraint') || message.includes('null value')) {
      return AppError.validation('Required field is missing')
    }

    if (message.includes('check constraint')) {
      return AppError.validation('Data validation failed')
    }
  }

  return AppError.internal('An unexpected database error occurred')
}
