'use client'

import type {
  TUser,
  TUserCondominiumAccess,
  TSuperadminUser,
  TPermission,
  TAllPermissionModule,
  TPermissionAction,
} from '@packages/domain'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { setUserCookie, clearUserCookie, getUserCookie } from '@/libs/cookies/user-cookie'
import {
  setCondominiumsCookie,
  setSelectedCondominiumCookie,
  clearSelectedCondominiumCookie,
  clearAllCondominiumCookies,
  getCondominiumsCookie,
  getSelectedCondominiumCookie,
} from '@/libs/cookies'
import {
  getSuperadminCookie,
  getSuperadminPermissionsCookie,
  setSuperadminCookie,
  setSuperadminPermissionsCookie,
  clearAllSuperadminCookies,
} from '@/libs/cookies/superadmin-cookie'

// ============================================================================
// TYPES
// ============================================================================

interface UserSlice {
  user: TUser | null
  isUserLoading: boolean
  setUser: (user: TUser) => void
  clearUser: () => void
  setIsUserLoading: (loading: boolean) => void
}

interface CondominiumSlice {
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
  isCondominiumLoading: boolean
  setCondominiums: (condominiums: TUserCondominiumAccess[]) => void
  selectCondominium: (condominium: TUserCondominiumAccess) => void
  clearSelectedCondominium: () => void
  clearAllCondominiums: () => void
  setIsCondominiumLoading: (loading: boolean) => void
}

interface SuperadminSlice {
  superadmin: TSuperadminUser | null
  permissions: TPermission[]
  setSuperadmin: (superadmin: TSuperadminUser) => void
  setPermissions: (permissions: TPermission[]) => void
  clearSuperadmin: () => void
}

interface SessionActions {
  // Computed properties
  hasMultipleCondominiums: () => boolean
  hasSelectedCondominium: () => boolean
  isSuperadmin: () => boolean
  hasPermission: (module: TAllPermissionModule, action: TPermissionAction) => boolean
  hasAnyPermission: (
    checks: Array<{ module: TAllPermissionModule; action: TPermissionAction }>
  ) => boolean
  hasAllPermissions: (
    checks: Array<{ module: TAllPermissionModule; action: TPermissionAction }>
  ) => boolean

  // Session management
  clearSession: () => void
  hydrateFromCookies: () => void
  hydrateFromServer: (data: {
    user?: TUser | null
    condominiums?: TUserCondominiumAccess[]
    selectedCondominium?: TUserCondominiumAccess | null
    superadmin?: TSuperadminUser | null
    permissions?: TPermission[]
  }) => void
}

export type SessionStore = UserSlice & CondominiumSlice & SuperadminSlice & SessionActions

// ============================================================================
// STORE
// ============================================================================

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────────────────────────────────
      // User Slice
      // ─────────────────────────────────────────────────────────────────────────
      user: null,
      isUserLoading: false,

      setUser: user => {
        set({ user })
        setUserCookie(user)
      },

      clearUser: () => {
        set({ user: null })
        clearUserCookie()
      },

      setIsUserLoading: isUserLoading => set({ isUserLoading }),

      // ─────────────────────────────────────────────────────────────────────────
      // Condominium Slice
      // ─────────────────────────────────────────────────────────────────────────
      condominiums: [],
      selectedCondominium: null,
      isCondominiumLoading: false,

      setCondominiums: condominiums => {
        set({ condominiums })
        setCondominiumsCookie(condominiums)
      },

      selectCondominium: condominium => {
        set({ selectedCondominium: condominium })
        setSelectedCondominiumCookie(condominium)
      },

      clearSelectedCondominium: () => {
        set({ selectedCondominium: null })
        clearSelectedCondominiumCookie()
      },

      clearAllCondominiums: () => {
        set({ condominiums: [], selectedCondominium: null })
        clearAllCondominiumCookies()
      },

      setIsCondominiumLoading: isCondominiumLoading => set({ isCondominiumLoading }),

      // ─────────────────────────────────────────────────────────────────────────
      // Superadmin Slice
      // ─────────────────────────────────────────────────────────────────────────
      superadmin: null,
      permissions: [],

      setSuperadmin: superadmin => {
        set({ superadmin })
        setSuperadminCookie(superadmin)
      },

      setPermissions: permissions => {
        set({ permissions })
        setSuperadminPermissionsCookie(permissions)
      },

      clearSuperadmin: () => {
        set({ superadmin: null, permissions: [] })
        clearAllSuperadminCookies()
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Computed Properties (as functions to avoid stale closures)
      // ─────────────────────────────────────────────────────────────────────────
      hasMultipleCondominiums: () => get().condominiums.length > 1,
      hasSelectedCondominium: () => get().selectedCondominium !== null,
      isSuperadmin: () => {
        const { superadmin } = get()

        return superadmin !== null && superadmin.isActive
      },

      hasPermission: (module, action) => {
        return get().permissions.some(p => p.module === module && p.action === action)
      },

      hasAnyPermission: checks => {
        const { hasPermission } = get()

        return checks.some(check => hasPermission(check.module, check.action))
      },

      hasAllPermissions: checks => {
        const { hasPermission } = get()

        return checks.every(check => hasPermission(check.module, check.action))
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Session Management
      // ─────────────────────────────────────────────────────────────────────────
      clearSession: () => {
        set({
          user: null,
          condominiums: [],
          selectedCondominium: null,
          superadmin: null,
          permissions: [],
          isUserLoading: false,
          isCondominiumLoading: false,
        })
        clearUserCookie()
        clearAllCondominiumCookies()
        clearAllSuperadminCookies()
      },

      hydrateFromCookies: () => {
        const user = getUserCookie()
        const condominiums = getCondominiumsCookie() ?? []
        const selectedCondominium = getSelectedCondominiumCookie()
        const superadmin = getSuperadminCookie()
        const permissions = getSuperadminPermissionsCookie() ?? []

        set({
          user,
          condominiums,
          selectedCondominium,
          superadmin,
          permissions,
        })
      },

      hydrateFromServer: data => {
        const currentState = get()

        set({
          user: data.user ?? currentState.user,
          condominiums: data.condominiums ?? currentState.condominiums,
          selectedCondominium: data.selectedCondominium ?? currentState.selectedCondominium,
          superadmin: data.superadmin ?? currentState.superadmin,
          permissions: data.permissions ?? currentState.permissions,
        })

        // Sync cookies with server data
        if (data.user) setUserCookie(data.user)
        if (data.condominiums) setCondominiumsCookie(data.condominiums)
        if (data.selectedCondominium) setSelectedCondominiumCookie(data.selectedCondominium)
        if (data.superadmin) setSuperadminCookie(data.superadmin)
        if (data.permissions) setSuperadminPermissionsCookie(data.permissions)
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist essential data, not loading states
        user: state.user,
        condominiums: state.condominiums,
        selectedCondominium: state.selectedCondominium,
        superadmin: state.superadmin,
        permissions: state.permissions,
      }),
    }
  )
)

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

export const selectUser = (state: SessionStore) => state.user
export const selectCondominiums = (state: SessionStore) => state.condominiums
export const selectSelectedCondominium = (state: SessionStore) => state.selectedCondominium
export const selectSuperadmin = (state: SessionStore) => state.superadmin
export const selectPermissions = (state: SessionStore) => state.permissions
export const selectIsUserLoading = (state: SessionStore) => state.isUserLoading
export const selectIsCondominiumLoading = (state: SessionStore) => state.isCondominiumLoading

// ============================================================================
// HOOKS (for backwards compatibility with existing context usage)
// ============================================================================

/**
 * Hook for user-related state. Provides backwards compatibility with useUser().
 */
export function useUser() {
  const user = useSessionStore(selectUser)
  const setUser = useSessionStore(s => s.setUser)
  const clearUser = useSessionStore(s => s.clearUser)
  const isLoading = useSessionStore(selectIsUserLoading)
  const setIsLoading = useSessionStore(s => s.setIsUserLoading)

  return { user, setUser, clearUser, isLoading, setIsLoading }
}

/**
 * Hook for condominium-related state. Provides backwards compatibility with useCondominium().
 */
export function useCondominium() {
  const condominiums = useSessionStore(selectCondominiums)
  const selectedCondominium = useSessionStore(selectSelectedCondominium)
  const setCondominiums = useSessionStore(s => s.setCondominiums)
  const selectCondominium = useSessionStore(s => s.selectCondominium)
  const clearSelectedCondominium = useSessionStore(s => s.clearSelectedCondominium)
  const clearAllCondominiums = useSessionStore(s => s.clearAllCondominiums)
  const hasMultipleCondominiums = useSessionStore(s => s.hasMultipleCondominiums)
  const hasSelectedCondominium = useSessionStore(s => s.hasSelectedCondominium)
  const isLoading = useSessionStore(selectIsCondominiumLoading)
  const setIsLoading = useSessionStore(s => s.setIsCondominiumLoading)

  return {
    condominiums,
    selectedCondominium,
    setCondominiums,
    selectCondominium,
    clearSelectedCondominium,
    clearAllCondominiums,
    hasMultipleCondominiums: hasMultipleCondominiums(),
    hasSelectedCondominium: hasSelectedCondominium(),
    isLoading,
    setIsLoading,
  }
}

/**
 * Hook for superadmin-related state. Provides backwards compatibility with useSuperadmin().
 */
export function useSuperadmin() {
  const superadmin = useSessionStore(selectSuperadmin)
  const permissions = useSessionStore(selectPermissions)
  const setSuperadmin = useSessionStore(s => s.setSuperadmin)
  const setPermissions = useSessionStore(s => s.setPermissions)
  const clearSuperadmin = useSessionStore(s => s.clearSuperadmin)
  const isSuperadmin = useSessionStore(s => s.isSuperadmin)
  const hasPermission = useSessionStore(s => s.hasPermission)
  const hasAnyPermission = useSessionStore(s => s.hasAnyPermission)
  const hasAllPermissions = useSessionStore(s => s.hasAllPermissions)

  return {
    superadmin,
    permissions,
    setSuperadmin,
    setPermissions,
    clearSuperadmin,
    isSuperadmin: isSuperadmin(),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
