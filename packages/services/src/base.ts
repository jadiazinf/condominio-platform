export interface IService<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}

export type TServiceResult<T, TError = string> =
  | { success: true; data: T }
  | { success: false; error: TError; code: TErrorCode }

export type TErrorCode = 'NOT_FOUND' | 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'INTERNAL_ERROR'

export function success<T>(data: T): TServiceResult<T> {
  return { success: true, data }
}

export function failure<T, TError = string>(error: TError, code: TErrorCode): TServiceResult<T, TError> {
  return { success: false, error, code }
}
