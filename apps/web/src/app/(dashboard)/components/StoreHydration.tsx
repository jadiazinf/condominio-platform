'use client'

import type { TUser, TUserCondominiumAccess } from '@packages/domain'

import { useEffect, useRef } from 'react'

import { useUser, useCondominium } from '@/contexts'

interface StoreHydrationProps {
  user: TUser | null
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
}

/**
 * Hydrates the client-side stores (user, condominiums) from server data.
 * Only sets data if the store is empty to avoid overwriting user actions.
 */
export function StoreHydration({ user, condominiums, selectedCondominium }: StoreHydrationProps) {
  const { user: currentUser, setUser } = useUser()
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

    // Hydrate user if store is empty
    if (!currentUser && user) {
      setUser(user)
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
    currentUser,
    currentCondominiums,
    currentSelected,
    setUser,
    setCondominiums,
    selectCondominium,
  ])

  return null
}
