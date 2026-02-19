import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TUnitOwnership, TUnitOwnershipCreate } from '@packages/domain'
import { useApiMutation } from './use-api-query'

const unitOwnershipKeys = {
  all: ['unit-ownerships'] as const,
  byUnit: (unitId: string) => ['unit-ownerships', 'unit', unitId] as const,
}

/**
 * Server-side function to get all ownerships for a unit.
 */
export async function getUnitOwnerships(
  token: string,
  unitId: string,
  condominiumId?: string,
  managementCompanyId?: string
): Promise<TUnitOwnership[]> {
  const client = getHttpClient()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (condominiumId) {
    headers['x-condominium-id'] = condominiumId
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiDataResponse<TUnitOwnership[]>>(
    `/condominium/unit-ownerships/unit/${unitId}`,
    { headers }
  )

  return response.data.data
}

interface UseResendOwnerInvitationOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface ResendOwnerInvitationVariables {
  ownershipId: string
}

export function useResendOwnerInvitation(options: UseResendOwnerInvitationOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<unknown>, ResendOwnerInvitationVariables>({
    path: (variables) => `/condominium/unit-ownerships/${variables.ownershipId}/resend-invitation`,
    method: 'POST',
    invalidateKeys: [unitOwnershipKeys.all],
    onSuccess: () => {
      onSuccess?.()
    },
    onError,
  })
}

interface UseCreateUnitOwnershipOptions {
  onSuccess?: (response: TApiDataResponse<TUnitOwnership>) => void
  onError?: (error: Error) => void
}

export function useCreateUnitOwnership(options: UseCreateUnitOwnershipOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUnitOwnership>, TUnitOwnershipCreate>({
    path: '/condominium/unit-ownerships',
    method: 'POST',
    invalidateKeys: [unitOwnershipKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TUnitOwnership>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}
