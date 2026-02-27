import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TUnitOwnership, TUnitOwnershipCreate, TOwnershipType } from '@packages/domain'
import { useApiMutation, useApiQuery } from './use-api-query'

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

// ─────────────────────────────────────────────────────────────────────────────
// Search user for ownership
// ─────────────────────────────────────────────────────────────────────────────

export interface TSearchUserResult {
  id: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  email: string
  phoneCountryCode: string | null
  phoneNumber: string | null
  idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber: string | null
  photoUrl: string | null
  isActive: boolean
}

interface TSearchUserResponse {
  data: TSearchUserResult | null
  found: boolean
}

export function useSearchUserForOwnership(query: string, enabled: boolean) {
  return useApiQuery<TSearchUserResponse>({
    path: `/condominium/unit-ownerships/search-user?q=${encodeURIComponent(query)}`,
    queryKey: [...unitOwnershipKeys.all, 'search-user', query],
    enabled: enabled && query.length > 0,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Add unit owner (search or register mode)
// ─────────────────────────────────────────────────────────────────────────────

export interface TAddUnitOwnerInput {
  unitId: string
  mode: 'search' | 'register'
  ownershipType: TOwnershipType
  userId?: string
  fullName?: string
  email?: string
  phone?: string
  phoneCountryCode?: string
  idDocumentType?: 'J' | 'G' | 'V' | 'E' | 'P' | null
  idDocumentNumber?: string
}

interface UseAddUnitOwnerOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useAddUnitOwner(options: UseAddUnitOwnerOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<unknown>, TAddUnitOwnerInput>({
    path: '/condominium/unit-ownerships/add-owner',
    method: 'POST',
    invalidateKeys: [unitOwnershipKeys.all],
    onSuccess: () => {
      onSuccess?.()
    },
    onError,
  })
}
