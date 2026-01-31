'use client'

/**
 * UserContext - Wrapper around the Zustand session store
 *
 * This context re-exports the user hooks from the session store
 * to maintain backwards compatibility with existing components.
 *
 * The Zustand store is the single source of truth for all session data.
 */

import { useEffect } from 'react'
import type { TUser } from '@packages/domain'
import { useUser as useStoreUser, useSessionStore } from '@/stores/session-store'

// Re-export the hook from the store
export const useUser = useStoreUser

interface UserProviderProps {
  children: React.ReactNode
  initialUser?: TUser | null
}

// Provider initializes the store with server-side data
export function UserProvider({ children, initialUser }: UserProviderProps) {
  const setUser = useSessionStore((state) => state.setUser)

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
    }
  }, [initialUser, setUser])

  return <>{children}</>
}
