import { QueryClient } from '@tanstack/react-query'
import { HttpError } from '../types/http'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (garbage collection time)
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (HttpError.isHttpError(error) && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 3
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

let defaultQueryClient: QueryClient | null = null

export function getQueryClient(): QueryClient {
  if (!defaultQueryClient) {
    defaultQueryClient = createQueryClient()
  }
  return defaultQueryClient
}

export function setQueryClient(client: QueryClient): void {
  defaultQueryClient = client
}
