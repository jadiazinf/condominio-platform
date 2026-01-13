/**
 * API Response Types
 *
 * Re-exported from @packages/http-client for consistency between client and server.
 * All response types are defined in the shared package to ensure type safety
 * across the entire application.
 */
export {
  // Error codes
  ApiErrorCodes,
  ApiErrorCodes as ErrorCodes,
  // Type guards
  isApiDataResponse,
  isApiMessageResponse,
  isApiValidationError,
  isApiErrorResponse,
  isApiSimpleError,
} from '@packages/http-client'

export type {
  // Success response types
  TApiDataResponse,
  TApiMessageResponse,
  TApiDataMessageResponse,
  TApiSuccessResponse,
  // Error response types
  TValidationFieldError,
  TApiValidationErrorResponse,
  TApiErrorResponse,
  TApiSimpleErrorResponse,
  TApiErrorResponseUnion,
  TApiErrorCode,
  // Combined types
  TApiResponse,
  // Utility types for entity responses
  TApiListResponse,
  TApiEntityResponse,
  TApiCreatedResponse,
  TApiUpdatedResponse,
  TApiDeletedResponse,
} from '@packages/http-client'

// Legacy type aliases for backwards compatibility
export type { TValidationFieldError as TFieldError } from '@packages/http-client'
export type { TApiValidationErrorResponse as TValidationErrorResponse } from '@packages/http-client'
export type { TApiErrorResponse as TErrorResponse } from '@packages/http-client'
export type { TApiErrorCode as TErrorCode } from '@packages/http-client'

// Legacy success response type (uses different structure than new types)
export type TSuccessResponse<T> = {
  success: true
  data: T
}
