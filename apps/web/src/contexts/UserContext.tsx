'use client'

import type { TUser } from '@packages/domain'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'

import { setUserCookie, clearUserCookie, getUserCookie } from '@/libs/cookies/user-cookie'

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
  // Initialize with initialUser prop, but will try to hydrate from cookie on mount
  const [user, setUserState] = useState<TUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)

  // Hydrate from client cookie on mount (handles page refresh)
  useEffect(() => {
    const cookieUser = getUserCookie()

    if (!user && cookieUser) {
      setUserState(cookieUser)
    }
  }, [])

  const setUser = useCallback((newUser: TUser) => {
    setUserState(newUser)
    setUserCookie(newUser)
  }, [])

  const clearUser = useCallback(() => {
    setUserState(null)
    clearUserCookie()
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
