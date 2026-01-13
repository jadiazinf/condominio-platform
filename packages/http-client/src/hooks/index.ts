export { createQueryClient, getQueryClient, setQueryClient } from "./query-client.js";
export { QueryProvider, type QueryProviderProps } from "./query-provider.js";
export {
  useApiQuery,
  useApiMutation,
  type UseApiQueryOptions,
  type UseApiMutationOptions,
} from "./use-api-query.js";
export {
  useHealthCheck,
  type HealthCheckResult,
  type UseHealthCheckOptions,
} from "./use-health-check.js";

// Re-export commonly used TanStack Query hooks
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
} from "@tanstack/react-query";
