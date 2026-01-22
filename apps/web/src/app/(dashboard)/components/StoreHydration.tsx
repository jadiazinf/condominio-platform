'use client'

import type { TUser, TUserCondominiumAccess } from '@packages/domain'

import { useEffect, useRef } from 'react'

import { useUser, useCondominium } from '@/contexts'
import { getUserCookie } from '@/libs/cookies/user-cookie'

interface StoreHydrationProps {
  user: TUser | null
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
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
 * Hydrates the client-side stores (user, condominiums) from server data.
 * Merges server data with client cookie data to preserve client-only updates like photoUrl.
 */
export function StoreHydration({ user, condominiums, selectedCondominium }: StoreHydrationProps) {
  const { setUser } = useUser()
  const {
    condominiums: currentCondominiums,
    selectedCondominium: currentSelected,
    setCondominiums,
    selectCondominium,
  } = useCondominium()

  const hasHydrated = useRef(false)

  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    // Read cookie directly to avoid race condition with UserContext hydration
    const cookieUser = getUserCookie()

    // Debug: Log hydration data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[StoreHydration] Server user:', user)
      console.log('[StoreHydration] Cookie user:', cookieUser)
    }

    // Merge server user with cookie user, preserving client-only data like photoUrl
    if (user) {
      const mergedUser = mergeUserData(user, cookieUser)

      if (process.env.NODE_ENV === 'development') {
        console.log('[StoreHydration] Merged user:', mergedUser)
      }

      setUser(mergedUser)
    }

    // Hydrate condominiums if store is empty
    if ((!currentCondominiums || currentCondominiums.length === 0) && condominiums.length > 0) {
      setCondominiums(condominiums)
    }

    // Hydrate selected condominium if store is empty
    if (!currentSelected && selectedCondominium) {
      selectCondominium(selectedCondominium)
    }
  }, [
    user,
    condominiums,
    selectedCondominium,
    currentCondominiums,
    currentSelected,
    setUser,
    setCondominiums,
    selectCondominium,
  ])

  return null
}
