export { createQueryClient, getQueryClient, setQueryClient } from './query-client'
export { QueryProvider, type QueryProviderProps } from './query-provider'
export {
  useApiQuery,
  useApiMutation,
  type UseApiQueryOptions,
  type UseApiMutationOptions,
} from './use-api-query'
export {
  useHealthCheck,
  type HealthCheckResult,
  type UseHealthCheckOptions,
} from './use-health-check'

// Re-export commonly used TanStack Query hooks
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
} from '@tanstack/react-query'
