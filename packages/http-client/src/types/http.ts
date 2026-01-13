export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
  signal?: AbortSignal
}

export interface ApiResponse<T> {
  data: T
  status: number
  headers: Headers
}

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: unknown
}

export class HttpError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly details?: unknown

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'HttpError'
    this.status = error.status
    this.code = error.code
    this.details = error.details
  }

  static isHttpError(error: unknown): error is HttpError {
    return error instanceof HttpError
  }
}
