'use client'

/**
 * SessionInitializer - Initializes Zustand session store with server-side data
 *
 * This component hydrates the session store with initial data from the server.
 * It replaces the old Provider pattern with a simpler approach that works
 * directly with the Zustand store.
 */

import { useEffect } from 'react'
import type { TUser, TUserCondominiumAccess } from '@packages/domain'
import { useSessionStore } from '@/stores/session-store'

interface SessionInitializerProps {
  children: React.ReactNode
  initialUser?: TUser | null
  initialCondominiums?: TUserCondominiumAccess[]
  initialSelectedCondominium?: TUserCondominiumAccess | null
}

export function SessionInitializer({
  children,
  initialUser,
  initialCondominiums,
  initialSelectedCondominium,
}: SessionInitializerProps) {
  const hydrateFromServer = useSessionStore((state) => state.hydrateFromServer)

  useEffect(() => {
    // Hydrate store with server-side data on mount
    hydrateFromServer({
      user: initialUser,
      condominiums: initialCondominiums,
      selectedCondominium: initialSelectedCondominium,
    })
  }, []) // Empty deps - only run once on mount

  return <>{children}</>
}
