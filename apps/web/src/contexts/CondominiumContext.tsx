'use client'

import type { TUserCondominiumAccess } from '@packages/domain'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

import {
  setCondominiumsCookie,
  setSelectedCondominiumCookie,
  clearSelectedCondominiumCookie,
  clearAllCondominiumCookies,
} from '@/libs/cookies'

interface CondominiumContextType {
  /** List of all condominiums the user has access to */
  condominiums: TUserCondominiumAccess[]
  /** The currently selected condominium for this session */
  selectedCondominium: TUserCondominiumAccess | null
  /** Set the list of condominiums (also persists to cookie) */
  setCondominiums: (condominiums: TUserCondominiumAccess[]) => void
  /** Select a condominium for the current session (also persists to cookie) */
  selectCondominium: (condominium: TUserCondominiumAccess) => void
  /** Clear the selected condominium */
  clearSelectedCondominium: () => void
  /** Clear all condominium data (condominiums list and selection) */
  clearAllCondominiums: () => void
  /** Whether the user has access to multiple condominiums */
  hasMultipleCondominiums: boolean
  /** Whether a condominium is currently selected */
  hasSelectedCondominium: boolean
  /** Loading state for condominium operations */
  isLoading: boolean
  /** Set loading state */
  setIsLoading: (loading: boolean) => void
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined)

interface CondominiumProviderProps {
  children: ReactNode
  initialCondominiums?: TUserCondominiumAccess[]
  initialSelectedCondominium?: TUserCondominiumAccess | null
}

export function CondominiumProvider({
  children,
  initialCondominiums,
  initialSelectedCondominium,
}: CondominiumProviderProps) {
  // Initialize state from props or empty array
  // Note: Cookie reading happens on client-side only, so we start with initialCondominiums or empty array
  // to avoid hydration mismatches. The CondominiumHydration component handles syncing from server data.
  const [condominiums, setCondominiumsState] = useState<TUserCondominiumAccess[]>(
    () => initialCondominiums ?? []
  )

  // Initialize selectedCondominium from props only to avoid hydration mismatches
  const [selectedCondominium, setSelectedCondominiumState] =
    useState<TUserCondominiumAccess | null>(() => initialSelectedCondominium ?? null)

  const [isLoading, setIsLoading] = useState(false)

  const setCondominiums = useCallback((newCondominiums: TUserCondominiumAccess[]) => {
    setCondominiumsState(newCondominiums)
    setCondominiumsCookie(newCondominiums)
  }, [])

  const selectCondominium = useCallback((condominium: TUserCondominiumAccess) => {
    setSelectedCondominiumState(condominium)
    setSelectedCondominiumCookie(condominium)
  }, [])

  const clearSelectedCondominium = useCallback(() => {
    setSelectedCondominiumState(null)
    clearSelectedCondominiumCookie()
  }, [])

  const clearAllCondominiums = useCallback(() => {
    setCondominiumsState([])
    setSelectedCondominiumState(null)
    clearAllCondominiumCookies()
  }, [])

  const hasMultipleCondominiums = (condominiums ?? []).length > 1
  const hasSelectedCondominium = selectedCondominium !== null

  const value = useMemo(
    () => ({
      condominiums,
      selectedCondominium,
      setCondominiums,
      selectCondominium,
      clearSelectedCondominium,
      clearAllCondominiums,
      hasMultipleCondominiums,
      hasSelectedCondominium,
      isLoading,
      setIsLoading,
    }),
    [
      condominiums,
      selectedCondominium,
      setCondominiums,
      selectCondominium,
      clearSelectedCondominium,
      clearAllCondominiums,
      hasMultipleCondominiums,
      hasSelectedCondominium,
      isLoading,
    ]
  )

  return <CondominiumContext.Provider value={value}>{children}</CondominiumContext.Provider>
}

export function useCondominium() {
  const context = useContext(CondominiumContext)

  if (context === undefined) {
    throw new Error('useCondominium must be used within a CondominiumProvider')
  }

  return context
}
