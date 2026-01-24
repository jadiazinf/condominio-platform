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
  getUserByEmail,
  type UseCurrentUserOptions,
  type UseUserByFirebaseUidOptions,
} from './use-user'
export { useUserCondominiums, type UseUserCondominiumsOptions } from './use-user-condominiums'
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
export {
  useManagementCompanies,
  useManagementCompaniesPaginated,
  useManagementCompany,
  useCreateManagementCompany,
  useUpdateManagementCompany,
  useToggleManagementCompanyActive,
  useCreateUser,
  getManagementCompanies,
  getManagementCompaniesPaginated,
  getManagementCompanyById,
  createManagementCompany,
  createUser,
  createManagementCompanyWithAdmin,
  toggleManagementCompanyActive,
  updateManagementCompany,
  type UseManagementCompaniesOptions,
  type UseManagementCompaniesPaginatedOptions,
  type UseManagementCompanyOptions,
  type UseCreateManagementCompanyOptions,
  type UseUpdateManagementCompanyOptions,
  type UseToggleManagementCompanyActiveOptions,
  type UseCreateUserOptions,
  type TCreateManagementCompanyWithAdminInput,
  type TCreateManagementCompanyWithAdminResult,
  type TToggleActiveInput,
} from './use-management-companies'
export {
  useLocationsByType,
  useLocationsByParent,
  useLocationById,
  getLocationsByType,
  getLocationsByParent,
  getLocationById,
  getLocationHierarchy,
  type UseLocationsByTypeOptions,
  type UseLocationsByParentOptions,
  type UseLocationByIdOptions,
} from './use-locations'
export {
  createCompanyWithAdmin,
  validateInvitationToken,
  acceptInvitation,
  cancelInvitation,
  getInvitationByToken,
  getPendingInvitationsByEmail,
  resendInvitationEmail,
  type TCreateCompanyWithAdminInput,
  type TCreateCompanyWithAdminResult,
  type TValidateInvitationResult,
  type TAcceptInvitationInput,
  type TAcceptInvitationResult,
} from './use-admin-invitations'

// Re-export commonly used TanStack Query hooks
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
} from '@tanstack/react-query'
