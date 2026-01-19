'use client'

import type { TUser } from '@packages/domain'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

interface UserContextType {
  user: TUser | null
  setUser: (user: TUser) => void
  clearUser: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
  initialUser?: TUser | null
}

export function UserProvider({ children, initialUser = null }: UserProviderProps) {
  const [user, setUserState] = useState<TUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)

  const setUser = useCallback((newUser: TUser) => {
    setUserState(newUser)
  }, [])

  const clearUser = useCallback(() => {
    setUserState(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      setUser,
      clearUser,
      isLoading,
      setIsLoading,
    }),
    [user, setUser, clearUser, isLoading]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }

  return context
}
