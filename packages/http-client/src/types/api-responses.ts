/**
 * API Response Types
 * These types represent the JSON body structures returned by the API.
 */

// ============================================================================
// Success Response Types
// ============================================================================

/**
 * Standard success response with data
 */
export type TApiDataResponse<T> = {
  data: T
}

/**
 * Success response with message only
 */
export type TApiMessageResponse = {
  message: string
}

/**
 * Success response with both data and message
 */
export type TApiDataMessageResponse<T> = {
  data: T
  message: string
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Validation error field detail
 */
export type TValidationFieldError = {
  field: string
  messages: string[]
}

/**
 * Validation error response (HTTP 422)
 */
export type TApiValidationErrorResponse = {
  success: false
  error: {
    code: 'VALIDATION_ERROR'
    message: string
    fields: TValidationFieldError[]
  }
}

/**
 * Standard error response
 */
export type TApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
  }
}

/**
 * Simple error response (legacy format)
 */
export type TApiSimpleErrorResponse = {
  error: string
}

// ============================================================================
// Error Codes
// ============================================================================

export const ApiErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  // Auth-specific error codes
  USER_NOT_REGISTERED: 'USER_NOT_REGISTERED',
  USER_DISABLED: 'USER_DISABLED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MALFORMED_HEADER: 'MALFORMED_HEADER',
} as const

export type TApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes]

// ============================================================================
// Combined Types
// ============================================================================

/**
 * All possible success response types
 */
export type TApiSuccessResponse<T> =
  | TApiDataResponse<T>
  | TApiMessageResponse
  | TApiDataMessageResponse<T>

/**
 * All possible error response types
 */
export type TApiErrorResponseUnion =
  | TApiValidationErrorResponse
  | TApiErrorResponse
  | TApiSimpleErrorResponse

/**
 * Complete API response union type
 */
export type TApiResponse<T> = TApiSuccessResponse<T> | TApiErrorResponseUnion

// ============================================================================
// Type Guards
// ============================================================================

export function isApiDataResponse<T>(response: unknown): response is TApiDataResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    !('success' in response && (response as { success: unknown }).success === false)
  )
}

export function isApiMessageResponse(response: unknown): response is TApiMessageResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'message' in response &&
    !('data' in response) &&
    !('success' in response)
  )
}

export function isApiValidationError(response: unknown): response is TApiValidationErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: unknown }).success === false &&
    'error' in response &&
    typeof (response as { error: unknown }).error === 'object' &&
    (response as { error: { code?: unknown } }).error !== null &&
    (response as { error: { code?: unknown } }).error.code === 'VALIDATION_ERROR'
  )
}

export function isApiErrorResponse(response: unknown): response is TApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: unknown }).success === false &&
    'error' in response &&
    typeof (response as { error: unknown }).error === 'object'
  )
}

export function isApiSimpleError(response: unknown): response is TApiSimpleErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as { error: unknown }).error === 'string'
  )
}

// ============================================================================
// Utility Types for Entity Responses
// ============================================================================

/**
 * List response type (array of entities)
 */
export type TApiListResponse<T> = TApiDataResponse<T[]>

/**
 * Single entity response type
 */
export type TApiEntityResponse<T> = TApiDataResponse<T>

/**
 * Created entity response type
 */
export type TApiCreatedResponse<T> = TApiDataResponse<T> | TApiDataMessageResponse<T>

/**
 * Updated entity response type
 */
export type TApiUpdatedResponse<T> = TApiDataResponse<T>

/**
 * Deleted response type (no content or message)
 */
export type TApiDeletedResponse = void | TApiMessageResponse
