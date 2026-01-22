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
export {
  useCurrentUser,
  useUserByFirebaseUid,
  type UseCurrentUserOptions,
  type UseUserByFirebaseUidOptions,
} from './use-user'
export {
  useUserCondominiums,
  type UseUserCondominiumsOptions,
} from './use-user-condominiums'
export {
  useRegisterWithGoogle,
  registerWithGoogle,
  useRegisterUser,
  registerUser,
  type UseRegisterWithGoogleOptions,
  type TGoogleRegisterVariables,
  type UseRegisterUserOptions,
  type TRegisterVariables,
} from './use-auth'
export { useUpdateProfile, updateProfile, type UseUpdateProfileOptions } from './use-update-profile'

// Re-export commonly used TanStack Query hooks
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
} from '@tanstack/react-query'
