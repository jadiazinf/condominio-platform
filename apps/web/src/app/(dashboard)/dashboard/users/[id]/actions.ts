'use server'

import { revalidatePath } from 'next/cache'
import { getServerAuthToken, configureServerLocale } from '@/libs/session'
import {
  updateUserStatus,
  updateUserRoleStatus,
  toggleUserPermission,
} from '@packages/http-client/hooks'
import { HttpError } from '@packages/http-client'

// Configure server-side locale for API requests
configureServerLocale()

/**
 * Extracts a meaningful error message from various error types
 */
function getErrorMessage(error: unknown, fallback: string): string {
  // Check for HttpError (by name property to avoid instanceof issues across modules)
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'HttpError' &&
    'message' in error &&
    'status' in error
  ) {
    const httpError = error as { message: string; status: number }
    return httpError.message || `${fallback} (HTTP ${httpError.status})`
  }

  // Also try the static method if available
  if (HttpError.isHttpError(error)) {
    return error.message || `${fallback} (HTTP ${error.status})`
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

/**
 * Server Action to update user active status
 */
export async function updateUserStatusAction(userId: string, isActive: boolean) {
  try {
    const token = await getServerAuthToken()
    const message = await updateUserStatus(token, userId, isActive)
    revalidatePath(`/dashboard/users/${userId}/status`)
    return { success: true, message }
  } catch (error) {
    console.error('Error updating user status:', error)
    return { success: false, error: getErrorMessage(error, 'Failed to update user status') }
  }
}

/**
 * Server Action to update user role active status
 */
export async function updateUserRoleStatusAction(
  userId: string,
  userRoleId: string,
  isActive: boolean
) {
  try {
    const token = await getServerAuthToken()
    const message = await updateUserRoleStatus(token, userRoleId, isActive)
    revalidatePath(`/dashboard/users/${userId}/status`)
    return { success: true, message }
  } catch (error) {
    console.error('Error updating user role status:', error)
    return { success: false, error: getErrorMessage(error, 'Failed to update role status') }
  }
}

/**
 * Server Action to toggle user permission
 */
export async function toggleUserPermissionAction(
  userId: string,
  permissionId: string,
  isEnabled: boolean
) {
  try {
    const token = await getServerAuthToken()
    const message = await toggleUserPermission(token, userId, permissionId, isEnabled)
    revalidatePath(`/dashboard/users/${userId}/permissions`)
    return { success: true, message }
  } catch (error) {
    console.error('Error toggling user permission:', error)
    return { success: false, error: getErrorMessage(error, 'Failed to toggle permission') }
  }
}
