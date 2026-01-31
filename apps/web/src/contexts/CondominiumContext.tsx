'use client'

/**
 * CondominiumContext - Wrapper around the Zustand session store
 *
 * This context re-exports the condominium hooks from the session store
 * to maintain backwards compatibility with existing components.
 *
 * The Zustand store is the single source of truth for all session data.
 */

import { useEffect } from 'react'
import type { TUserCondominiumAccess } from '@packages/domain'
import { useCondominium as useStoreCondominium, useSessionStore } from '@/stores/session-store'

// Re-export the hook from the store
export const useCondominium = useStoreCondominium

interface CondominiumProviderProps {
  children: React.ReactNode
  initialCondominiums?: TUserCondominiumAccess[]
  initialSelectedCondominium?: TUserCondominiumAccess | null
}

// Provider initializes the store with server-side data
export function CondominiumProvider({
  children,
  initialCondominiums,
  initialSelectedCondominium,
}: CondominiumProviderProps) {
  const setCondominiums = useSessionStore((state) => state.setCondominiums)
  const selectCondominium = useSessionStore((state) => state.selectCondominium)

  useEffect(() => {
    if (initialCondominiums && initialCondominiums.length > 0) {
      setCondominiums(initialCondominiums)
    }
    if (initialSelectedCondominium) {
      selectCondominium(initialSelectedCondominium)
    }
  }, [initialCondominiums, initialSelectedCondominium, setCondominiums, selectCondominium])

  return <>{children}</>
}
