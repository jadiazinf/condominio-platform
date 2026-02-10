'use client'

import type { TUser, TUserCondominiumAccess, TUserRole, TPermission, TUserManagementCompanyAccess, TActiveRoleType } from '@packages/domain'

import { useEffect, useRef } from 'react'

import { useUser, useCondominium, useSuperadmin, useManagementCompany, useActiveRole } from '@/stores/session-store'
import { getUserCookie, setUserCookie } from '@/libs/cookies/user-cookie'
import {
  setCondominiumsCookie,
  setSelectedCondominiumCookie,
} from '@/libs/cookies/condominium-cookie'
import {
  setSuperadminCookie,
  setSuperadminPermissionsCookie,
} from '@/libs/cookies/superadmin-cookie'
import {
  setManagementCompaniesCookie,
  setActiveRoleCookie,
} from '@/libs/cookies/management-company-cookie'
import { getProfilePhotoUrl } from '@/libs/firebase'

interface StoreHydrationProps {
  user: TUser | null
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
  superadmin?: TUserRole | null
  superadminPermissions?: TPermission[]
  managementCompanies?: TUserManagementCompanyAccess[]
  activeRole?: TActiveRoleType | null
  /** True if data was fetched from API (not from cookies) - should update cookies */
  wasFetched?: boolean
}

/**
 * Merges server user data with client user data, preferring client values
 * for fields that exist only on the client (like photoUrl after upload).
 */
function mergeUserData(serverUser: TUser, clientUser: TUser | null): TUser {
  if (!clientUser) return serverUser

  // Always prefer client's photoUrl if it exists
  // This handles the case where user uploads a photo and then refreshes,
  // and the server hasn't persisted it yet or returns stale data
  const mergedUser = { ...serverUser }

  if (clientUser.photoUrl) {
    mergedUser.photoUrl = clientUser.photoUrl
  }

  return mergedUser
}

/**
 * Hydrates the client-side stores (user, condominiums, superadmin) from server data.
 * Merges server data with client cookie data to preserve client-only updates like photoUrl.
 * Also updates cookies when data was freshly fetched from API.
 */
export function StoreHydration({
  user,
  condominiums,
  selectedCondominium,
  superadmin,
  superadminPermissions,
  managementCompanies,
  activeRole,
  wasFetched = false,
}: StoreHydrationProps) {
  const { setUser } = useUser()
  const {
    condominiums: currentCondominiums,
    selectedCondominium: currentSelected,
    setCondominiums,
    selectCondominium,
  } = useCondominium()
  const {
    superadmin: currentSuperadmin,
    permissions: currentPermissions,
    setSuperadmin,
    setPermissions,
    clearSuperadmin,
  } = useSuperadmin()
  const {
    managementCompanies: currentManagementCompanies,
    setManagementCompanies,
  } = useManagementCompany()
  const {
    setActiveRole,
  } = useActiveRole()

  const hasHydrated = useRef(false)
  const hasRefreshedPhotoUrl = useRef(false)

  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    // Read cookie directly to avoid race condition with UserContext hydration
    const cookieUser = getUserCookie()

    // Merge server user with cookie user, preserving client-only data like photoUrl
    if (user) {
      const mergedUser = mergeUserData(user, cookieUser)

      setUser(mergedUser)

      // If data was fetched from API, update cookies
      if (wasFetched) {
        setUserCookie(mergedUser)
      }
    }

    // Hydrate condominiums if store is empty
    if ((!currentCondominiums || currentCondominiums.length === 0) && condominiums.length > 0) {
      setCondominiums(condominiums)

      // If data was fetched from API, update cookies
      if (wasFetched) {
        setCondominiumsCookie(condominiums)
      }
    }

    // Hydrate selected condominium if store is empty
    if (!currentSelected && selectedCondominium) {
      selectCondominium(selectedCondominium)

      // If data was fetched from API, update cookie
      if (wasFetched) {
        setSelectedCondominiumCookie(selectedCondominium)
      }
    }

    // Always update superadmin data from server since we always fetch it fresh
    // This ensures permission changes are reflected immediately
    if (superadmin) {
      setSuperadmin(superadmin)
      setSuperadminCookie(superadmin)
    } else if (currentSuperadmin) {
      // User is no longer a superadmin, clear the data
      clearSuperadmin()
    }

    if (superadminPermissions && superadminPermissions.length > 0) {
      setPermissions(superadminPermissions)
      setSuperadminPermissionsCookie(superadminPermissions)
    } else if (currentPermissions && currentPermissions.length > 0) {
      // Permissions were removed, clear them
      setPermissions([])
      setSuperadminPermissionsCookie([])
    }

    // Hydrate management companies
    if (managementCompanies && managementCompanies.length > 0 &&
        (!currentManagementCompanies || currentManagementCompanies.length === 0)) {
      setManagementCompanies(managementCompanies)

      if (wasFetched) {
        setManagementCompaniesCookie(managementCompanies)
      }
    }

    // Hydrate active role
    if (activeRole) {
      setActiveRole(activeRole)
      setActiveRoleCookie(activeRole)
    }
  }, [
    user,
    condominiums,
    selectedCondominium,
    superadmin,
    superadminPermissions,
    managementCompanies,
    activeRole,
    wasFetched,
    currentCondominiums,
    currentSelected,
    currentSuperadmin,
    currentPermissions,
    currentManagementCompanies,
    setUser,
    setCondominiums,
    selectCondominium,
    setSuperadmin,
    setPermissions,
    clearSuperadmin,
    setManagementCompanies,
    setActiveRole,
  ])

  // Refresh photo URL from Firebase Storage to ensure it has a valid token
  useEffect(() => {
    if (!user || hasRefreshedPhotoUrl.current) return

    async function refreshPhotoUrl() {
      hasRefreshedPhotoUrl.current = true

      try {
        // Get fresh URL from Firebase Storage
        const freshPhotoUrl = await getProfilePhotoUrl(user!.id)

        // Update user with fresh photo URL (or null if photo doesn't exist)
        const updatedUser = { ...user!, photoUrl: freshPhotoUrl }
        setUser(updatedUser)
        setUserCookie(updatedUser)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[StoreHydration] Error refreshing photo URL:', error)
        }
      }
    }

    refreshPhotoUrl()
  }, [user, setUser])

  return null
}
