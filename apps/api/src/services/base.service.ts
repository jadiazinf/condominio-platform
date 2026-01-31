/**
 * Base interface for all services.
 * Services contain business logic and orchestrate operations.
 */
export interface IService<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}

/**
 * Service result wrapper for handling success/error states.
 * TError defaults to string for backwards compatibility but can be any type.
 */
export type TServiceResult<T, TError = string> =
  | { success: true; data: T }
  | { success: false; error: TError; code: TErrorCode }

export type TErrorCode = 'NOT_FOUND' | 'BAD_REQUEST' | 'CONFLICT' | 'INTERNAL_ERROR'

/**
 * Helper functions to create service results.
 */
export function success<T>(data: T): TServiceResult<T> {
  return { success: true, data }
}

export function failure<T, TError = string>(error: TError, code: TErrorCode): TServiceResult<T, TError> {
  return { success: false, error, code }
}
