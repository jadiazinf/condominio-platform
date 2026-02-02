import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'

// =============================================================================
// Types
// =============================================================================

/**
 * Input for creating a user invitation
 */
export interface TCreateUserInvitationInput {
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  phoneCountryCode?: string | null
  phoneNumber?: string | null
  idDocumentType?: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber?: string | null
  condominiumId?: string | null
  roleId: string
}

/**
 * User in invitation response
 */
export interface TInvitationUser {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  isActive: boolean
}

/**
 * Invitation details
 */
export interface TUserInvitation {
  id: string
  userId: string
  condominiumId: string | null
  roleId: string
  token: string
  tokenHash: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  email: string
  expiresAt: string
  acceptedAt: string | null
  emailError: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

/**
 * User role details
 */
export interface TInvitationUserRole {
  id: string
  userId: string
  roleId: string
  condominiumId: string | null
  buildingId: string | null
  isActive: boolean
  notes: string | null
  assignedAt: string
  assignedBy: string | null
}

/**
 * Result of creating a user invitation
 */
export interface TCreateUserInvitationResult {
  user: TInvitationUser
  invitation: TUserInvitation
  userRole: TInvitationUserRole
  emailSent: boolean
  invitationToken: string
}

/**
 * Condominium in validation response
 */
export interface TValidationCondominium {
  id: string
  name: string
}

/**
 * Role in validation response
 */
export interface TValidationRole {
  id: string
  name: string
}

/**
 * Result of validating a user invitation token
 */
export interface TValidateUserInvitationResult {
  isValid: boolean
  isExpired: boolean
  user: {
    email: string
    firstName: string | null
    lastName: string | null
    phoneCountryCode: string | null
    phoneNumber: string | null
  }
  condominium: TValidationCondominium | null
  role: TValidationRole
}

/**
 * Result of accepting a user invitation
 */
export interface TAcceptUserInvitationResult {
  user: TInvitationUser
  invitation: TUserInvitation
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Create a new user invitation
 */
export async function createUserInvitation(
  token: string,
  input: TCreateUserInvitationInput
): Promise<TCreateUserInvitationResult> {
  const client = getHttpClient()

  const response = await client.post<TApiDataResponse<TCreateUserInvitationResult>>(
    '/user-invitations',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: input,
    }
  )

  return response.data.data
}

/**
 * Validate a user invitation token (public endpoint)
 */
export async function validateUserInvitationToken(
  invitationToken: string
): Promise<TValidateUserInvitationResult> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TValidateUserInvitationResult>>(
    `/user-invitations/validate/${invitationToken}`
  )

  return response.data.data
}

/**
 * Accept a user invitation
 */
export async function acceptUserInvitation(
  invitationToken: string,
  firebaseToken: string
): Promise<TAcceptUserInvitationResult> {
  const client = getHttpClient()

  const response = await client.post<TApiDataResponse<TAcceptUserInvitationResult>>(
    `/user-invitations/accept/${invitationToken}`,
    {
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.data
}

/**
 * Resend a user invitation email
 */
export async function resendUserInvitationEmail(
  token: string,
  invitationId: string
): Promise<{ success: boolean; message: string }> {
  const client = getHttpClient()

  const response = await client.post<TApiDataResponse<{ success: boolean; message: string }>>(
    `/user-invitations/${invitationId}/resend-email`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.data
}

/**
 * Cancel a user invitation
 */
export async function cancelUserInvitation(
  token: string,
  invitationId: string
): Promise<TUserInvitation> {
  const client = getHttpClient()

  const response = await client.delete<TApiDataResponse<TUserInvitation>>(
    `/user-invitations/${invitationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}
