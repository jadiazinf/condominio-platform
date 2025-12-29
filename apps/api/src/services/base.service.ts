/**
 * Base interface for all services.
 * Services contain business logic and orchestrate operations.
 */
export interface IService<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}

/**
 * Service result wrapper for handling success/error states.
 */
export type TServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: TErrorCode }

export type TErrorCode = 'NOT_FOUND' | 'BAD_REQUEST' | 'CONFLICT' | 'INTERNAL_ERROR'

/**
 * Helper functions to create service results.
 */
export function success<T>(data: T): TServiceResult<T> {
  return { success: true, data }
}

export function failure<T>(error: string, code: TErrorCode): TServiceResult<T> {
  return { success: false, error, code }
}
