import { getEnvConfig } from "../config/env.js";
import type {
  HttpMethod,
  RequestConfig,
  ApiResponse,
  ApiError,
} from "../types/http.js";
import { HttpError } from "../types/http.js";

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as T;
}

async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: Partial<ApiError> = {};

  try {
    const body = await parseResponseBody<{ message?: string; code?: string }>(
      response
    );
    if (typeof body === "object" && body !== null) {
      errorData = body;
    }
  } catch {
    // Ignore parsing errors
  }

  const error: ApiError = {
    message:
      errorData.message ?? response.statusText ?? "An unknown error occurred",
    status: response.status,
    code: errorData.code,
    details: errorData,
  };

  throw new HttpError(error);
}

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  getAuthToken?: () => string | null | Promise<string | null>;
}

export function createHttpClient(config: HttpClientConfig = {}) {
  const getBaseUrl = () => config.baseUrl ?? getEnvConfig().apiBaseUrl;
  const getTimeout = () => config.timeout ?? getEnvConfig().apiTimeout;

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    requestConfig?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const baseUrl = getBaseUrl();
    const url = buildUrl(baseUrl, path, requestConfig?.params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
      ...requestConfig?.headers,
    };

    if (config.getAuthToken) {
      const token = await config.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const timeout = requestConfig?.timeout ?? getTimeout();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: requestConfig?.signal ?? controller.signal,
      });

      if (!response.ok) {
        await handleErrorResponse(response);
      }

      const data = await parseResponseBody<T>(response);

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    get<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>("GET", path, undefined, config);
    },

    post<T>(
      path: string,
      body?: unknown,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      return request<T>("POST", path, body, config);
    },

    put<T>(
      path: string,
      body?: unknown,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      return request<T>("PUT", path, body, config);
    },

    patch<T>(
      path: string,
      body?: unknown,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      return request<T>("PATCH", path, body, config);
    },

    delete<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
      return request<T>("DELETE", path, undefined, config);
    },
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;

// Default client instance (uses env config)
let defaultClient: HttpClient | null = null;

export function getHttpClient(): HttpClient {
  if (!defaultClient) {
    defaultClient = createHttpClient();
  }
  return defaultClient;
}

export function setHttpClient(client: HttpClient): void {
  defaultClient = client;
}
