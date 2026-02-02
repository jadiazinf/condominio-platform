'use server'

import { revalidatePath } from 'next/cache'
import { getServerAuthToken } from '@/libs/session'
import {
  updateUserStatus,
  updateUserRoleStatus,
  toggleUserPermission,
  promoteUserToSuperadmin,
  demoteUserFromSuperadmin,
} from '@packages/http-client/hooks'

/**
 * Server Action to update user active status
 */
export async function updateUserStatusAction(userId: string, isActive: boolean) {
  try {
    const token = await getServerAuthToken()
    await updateUserStatus(token, userId, isActive)
    revalidatePath(`/dashboard/users/${userId}/status`)
    return { success: true }
  } catch (error) {
    console.error('Error updating user status:', error)
    return { success: false, error: 'Failed to update user status' }
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
    await updateUserRoleStatus(token, userRoleId, isActive)
    revalidatePath(`/dashboard/users/${userId}/status`)
    return { success: true }
  } catch (error) {
    console.error('Error updating user role status:', error)
    return { success: false, error: 'Failed to update role status' }
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
    await toggleUserPermission(token, userId, permissionId, isEnabled)
    revalidatePath(`/dashboard/users/${userId}/permissions`)
    return { success: true }
  } catch (error) {
    console.error('Error toggling user permission:', error)
    return { success: false, error: 'Failed to toggle permission' }
  }
}

/**
 * Server Action to promote a user to superadmin
 */
export async function promoteUserToSuperadminAction(
  userId: string,
  permissionIds: string[]
) {
  try {
    const token = await getServerAuthToken()
    await promoteUserToSuperadmin(token, userId, permissionIds)
    revalidatePath(`/dashboard/users/${userId}/status`)
    revalidatePath(`/dashboard/users/${userId}`)
    return { success: true }
  } catch (error) {
    console.error('Error promoting user to superadmin:', error)
    return { success: false, error: 'Failed to promote user to superadmin' }
  }
}

/**
 * Server Action to demote a superadmin user
 */
export async function demoteUserFromSuperadminAction(userId: string) {
  try {
    const token = await getServerAuthToken()
    await demoteUserFromSuperadmin(token, userId)
    revalidatePath(`/dashboard/users/${userId}/status`)
    revalidatePath(`/dashboard/users/${userId}`)
    return { success: true }
  } catch (error) {
    console.error('Error demoting user from superadmin:', error)
    return { success: false, error: 'Failed to demote user from superadmin' }
  }
}
