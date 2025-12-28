import type { TRepositoryResponse, TRepositoryResultObject } from './types'

export function adaptRepositoryResponse<T>(
  response: TRepositoryResponse<T>
): TRepositoryResultObject<T> {
  const [executed, data, validationError] = response
  return { executed, data, validationError }
}
