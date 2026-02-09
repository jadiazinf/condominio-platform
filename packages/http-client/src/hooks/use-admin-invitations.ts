import type {
  TAdminInvitation,
  TUser,
  TUserCreate,
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyMember,
  TManagementCompanySubscription,
} from '@packages/domain'

import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'

// =============================================================================
// Types
// =============================================================================

export type TCreateCompanyWithAdminInput = {
  company: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'>
  admin: Omit<TUserCreate, 'firebaseUid' | 'isActive' | 'isEmailVerified'>
  expirationDays?: number
}

export type TCreateCompanyWithAdminResult = {
  company: TManagementCompany
  admin: TUser
  invitation: TAdminInvitation
  invitationToken: string
  emailSent: boolean
}

export type TValidateInvitationResult = {
  invitation: TAdminInvitation
  user: TUser
  managementCompany: TManagementCompany
  isExpired: boolean
  isValid: boolean
}

export type TAcceptInvitationInput = {
  firebaseUid: string
}

export type TAcceptInvitationResult = {
  invitation: TAdminInvitation
  user: TUser
  managementCompany: TManagementCompany
}

export type TCreateCompanyWithExistingAdminInput = {
  company: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'>
  existingUserId: string
}

export type TCreateCompanyWithExistingAdminResult = {
  company: TManagementCompany
  admin: TUser
  member: TManagementCompanyMember
  subscription: TManagementCompanySubscription
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Creates a management company with a new admin user and invitation.
 * The admin user is created as inactive until they accept the invitation.
 */
export async function createCompanyWithAdmin(
  token: string,
  input: TCreateCompanyWithAdminInput
): Promise<TCreateCompanyWithAdminResult> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TCreateCompanyWithAdminResult>>(
    '/platform/admin-invitations/create-with-admin',
    input,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Validates an invitation token without accepting it.
 * Returns invitation details and validity status.
 * This endpoint does NOT require authentication.
 */
export async function validateInvitationToken(
  token: string
): Promise<TValidateInvitationResult> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TValidateInvitationResult>>(
    `/platform/admin-invitations/validate/${token}`
  )

  return response.data.data
}

/**
 * Accepts an invitation and activates the user and company.
 * Requires the Firebase UID from the newly created Firebase account.
 * This endpoint does NOT require authentication.
 */
export async function acceptInvitation(
  invitationToken: string,
  input: TAcceptInvitationInput
): Promise<TAcceptInvitationResult> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TAcceptInvitationResult>>(
    `/platform/admin-invitations/accept/${invitationToken}`,
    input
  )

  return response.data.data
}

/**
 * Cancels a pending invitation.
 * Requires authentication.
 */
export async function cancelInvitation(
  token: string,
  invitationId: string
): Promise<TAdminInvitation> {
  const client = getHttpClient()
  const response = await client.delete<TApiDataResponse<TAdminInvitation>>(
    `/platform/admin-invitations/${invitationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Gets an invitation by its token.
 * This endpoint does NOT require authentication.
 */
export async function getInvitationByToken(token: string): Promise<TAdminInvitation> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAdminInvitation>>(
    `/platform/admin-invitations/validate/${token}`
  )

  return response.data.data
}

/**
 * Gets pending invitations for an email address.
 * Requires authentication.
 */
export async function getPendingInvitationsByEmail(
  authToken: string,
  email: string
): Promise<TAdminInvitation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TAdminInvitation[]>>(
    `/platform/admin-invitations/by-email/${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  )

  return response.data.data
}

/**
 * Resends the invitation email for a pending invitation.
 * Generates a new token and sends a fresh email.
 * Requires authentication.
 */
export async function resendInvitationEmail(
  authToken: string,
  invitationId: string
): Promise<{ success: boolean; message: string }> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<{ success: boolean; message: string }>>(
    `/platform/admin-invitations/${invitationId}/resend-email`,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  )

  return response.data.data
}

/**
 * Creates a management company with an existing user as admin.
 * The company is created active and the user is immediately linked as primary admin.
 */
export async function createCompanyWithExistingAdmin(
  token: string,
  input: TCreateCompanyWithExistingAdminInput
): Promise<TCreateCompanyWithExistingAdminResult> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TCreateCompanyWithExistingAdminResult>>(
    '/platform/admin-invitations/create-with-existing-admin',
    input,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}
