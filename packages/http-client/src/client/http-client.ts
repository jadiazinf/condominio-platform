import { getEnvConfig } from '../config/env'
import type { HttpMethod, RequestConfig, ApiResponse, ApiError } from '../types/http'
import { HttpError } from '../types/http'

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  // Remove trailing slash from baseUrl and leading slash from path to concatenate properly
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${normalizedBase}${normalizedPath}`

  const url = new URL(fullUrl)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>
  }

  return response.text() as unknown as T
}

async function handleErrorResponse(response: Response): Promise<never> {
  let message: string | undefined
  let code: string | undefined
  let details: unknown

  try {
    const body = await parseResponseBody<unknown>(response)
    details = body

    if (typeof body === 'object' && body !== null) {
      // Handle typed error format: { error: { code, message } }
      if ('error' in body && typeof (body as { error: unknown }).error === 'object') {
        const errorObj = (body as { error: { code?: string; message?: string } }).error
        message = errorObj?.message
        code = errorObj?.code
      }
      // Handle simple error format: { error: string }
      else if ('error' in body && typeof (body as { error: unknown }).error === 'string') {
        message = (body as { error: string }).error
      }
      // Handle flat format: { message, code }
      else if ('message' in body) {
        message = (body as { message?: string }).message
        code = (body as { code?: string }).code
      }
    }
  } catch {
    // Ignore parsing errors
  }

  const error: ApiError = {
    message: message ?? response.statusText ?? 'An unknown error occurred',
    status: response.status,
    code,
    details,
  }

  throw new HttpError(error)
}

export interface HttpClientConfig {
  baseUrl?: string
  defaultHeaders?: Record<string, string>
  timeout?: number
  getAuthToken?: () => string | null | Promise<string | null>
  getLocale?: () => string | null | Promise<string | null>
}

export function createHttpClient(config: HttpClientConfig = {}) {
  const getBaseUrl = () => config.baseUrl ?? getEnvConfig().apiBaseUrl
  const getTimeout = () => config.timeout ?? getEnvConfig().apiTimeout

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    requestConfig?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const baseUrl = getBaseUrl()
    const url = buildUrl(baseUrl, path, requestConfig?.params)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
      ...requestConfig?.headers,
    }

    if (config.getAuthToken) {
      const token = await config.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    if (config.getLocale) {
      const locale = await config.getLocale()
      if (locale) {
        headers['Accept-Language'] = locale
      }
    }

    const timeout = requestConfig?.timeout ?? getTimeout()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: requestConfig?.signal ?? controller.signal,
      })

      if (!response.ok) {
        await handleErrorResponse(response)
      }

      const data = await parseResponseBody<T>(response)

      return {
        data,
        status: response.status,
        headers: response.headers,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return {
    get<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>('GET', path, undefined, config)
    },

    post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>('POST', path, body, config)
    },

    put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>('PUT', path, body, config)
    },

    patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>('PATCH', path, body, config)
    },

    delete<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>('DELETE', path, undefined, config)
    },
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>

// Global locale getter (can be set by the app)
let globalLocaleGetter: (() => string | null) | null = null

export function setGlobalLocale(localeGetter: () => string | null): void {
  globalLocaleGetter = localeGetter
  // Reset the default client so it picks up the new locale getter
  if (defaultClient) {
    defaultClient = null
  }
}

// Default client instance (uses env config)
let defaultClient: HttpClient | null = null

export function getHttpClient(): HttpClient {
  if (!defaultClient) {
    defaultClient = createHttpClient({
      getLocale: globalLocaleGetter ?? undefined,
    })
  }
  return defaultClient
}

export function setHttpClient(client: HttpClient): void {
  defaultClient = client
}
