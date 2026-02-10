'use client'

import type {
  TUser,
  TUserCondominiumAccess,
  TUserRole,
  TPermission,
  TAllPermissionModule,
  TPermissionAction,
  TUserManagementCompanyAccess,
  TActiveRoleType,
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
import {
  setManagementCompaniesCookie,
  getManagementCompaniesCookie,
  clearManagementCompaniesCookie,
  setActiveRoleCookie,
  getActiveRoleCookie,
  clearActiveRoleCookie,
  clearAllManagementCompanyCookies,
} from '@/libs/cookies/management-company-cookie'

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
  superadmin: TUserRole | null
  permissions: TPermission[]
  setSuperadmin: (superadmin: TUserRole) => void
  setPermissions: (permissions: TPermission[]) => void
  clearSuperadmin: () => void
}

interface ManagementCompanySlice {
  managementCompanies: TUserManagementCompanyAccess[]
  setManagementCompanies: (companies: TUserManagementCompanyAccess[]) => void
  clearManagementCompanies: () => void
}

interface ActiveRoleSlice {
  activeRole: TActiveRoleType | null
  setActiveRole: (role: TActiveRoleType) => void
  clearActiveRole: () => void
  availableRoles: () => TActiveRoleType[]
  needsRoleSelection: () => boolean
  isAdmin: () => boolean
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
    superadmin?: TUserRole | null
    permissions?: TPermission[]
    managementCompanies?: TUserManagementCompanyAccess[]
    activeRole?: TActiveRoleType | null
  }) => void
}

export type SessionStore = UserSlice & CondominiumSlice & SuperadminSlice & ManagementCompanySlice & ActiveRoleSlice & SessionActions

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
      // Management Company Slice
      // ─────────────────────────────────────────────────────────────────────────
      managementCompanies: [],

      setManagementCompanies: managementCompanies => {
        set({ managementCompanies })
        setManagementCompaniesCookie(managementCompanies)
      },

      clearManagementCompanies: () => {
        set({ managementCompanies: [] })
        clearManagementCompaniesCookie()
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Active Role Slice
      // ─────────────────────────────────────────────────────────────────────────
      activeRole: null,

      setActiveRole: activeRole => {
        set({ activeRole })
        setActiveRoleCookie(activeRole)
      },

      clearActiveRole: () => {
        set({ activeRole: null })
        clearActiveRoleCookie()
      },

      availableRoles: () => {
        const state = get()
        const roles: TActiveRoleType[] = []
        if (state.superadmin?.isActive) roles.push('superadmin')
        if (state.managementCompanies.length > 0) roles.push('management_company')
        if (state.condominiums.length > 0) roles.push('condominium')
        return roles
      },

      needsRoleSelection: () => {
        const { activeRole, availableRoles } = get()
        const roles = availableRoles()
        return roles.length > 1 && !activeRole
      },

      isAdmin: () => {
        return get().activeRole === 'management_company'
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
          managementCompanies: [],
          activeRole: null,
          isUserLoading: false,
          isCondominiumLoading: false,
        })
        clearUserCookie()
        clearAllCondominiumCookies()
        clearAllSuperadminCookies()
        clearAllManagementCompanyCookies()
      },

      hydrateFromCookies: () => {
        const user = getUserCookie()
        const condominiums = getCondominiumsCookie() ?? []
        const selectedCondominium = getSelectedCondominiumCookie()
        const superadmin = getSuperadminCookie()
        const permissions = getSuperadminPermissionsCookie() ?? []
        const managementCompanies = getManagementCompaniesCookie() ?? []
        const activeRole = getActiveRoleCookie()

        set({
          user,
          condominiums,
          selectedCondominium,
          superadmin,
          permissions,
          managementCompanies,
          activeRole,
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
          managementCompanies: data.managementCompanies ?? currentState.managementCompanies,
          activeRole: data.activeRole ?? currentState.activeRole,
        })

        // Sync cookies with server data
        if (data.user) setUserCookie(data.user)
        if (data.condominiums) setCondominiumsCookie(data.condominiums)
        if (data.selectedCondominium) setSelectedCondominiumCookie(data.selectedCondominium)
        if (data.superadmin) setSuperadminCookie(data.superadmin)
        if (data.permissions) setSuperadminPermissionsCookie(data.permissions)
        if (data.managementCompanies) setManagementCompaniesCookie(data.managementCompanies)
        if (data.activeRole) setActiveRoleCookie(data.activeRole)
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
        managementCompanies: state.managementCompanies,
        activeRole: state.activeRole,
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
export const selectManagementCompanies = (state: SessionStore) => state.managementCompanies
export const selectActiveRole = (state: SessionStore) => state.activeRole

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

/**
 * Hook for management company-related state.
 */
export function useManagementCompany() {
  const managementCompanies = useSessionStore(selectManagementCompanies)
  const setManagementCompanies = useSessionStore(s => s.setManagementCompanies)
  const clearManagementCompanies = useSessionStore(s => s.clearManagementCompanies)
  const isAdmin = useSessionStore(s => s.isAdmin)

  return {
    managementCompanies,
    setManagementCompanies,
    clearManagementCompanies,
    isAdmin: isAdmin(),
    hasManagementCompanies: managementCompanies.length > 0,
  }
}

/**
 * Hook for active role state.
 */
export function useActiveRole() {
  const activeRole = useSessionStore(selectActiveRole)
  const setActiveRole = useSessionStore(s => s.setActiveRole)
  const clearActiveRole = useSessionStore(s => s.clearActiveRole)
  const availableRoles = useSessionStore(s => s.availableRoles)
  const needsRoleSelection = useSessionStore(s => s.needsRoleSelection)

  return {
    activeRole,
    setActiveRole,
    clearActiveRole,
    availableRoles: availableRoles(),
    needsRoleSelection: needsRoleSelection(),
  }
}
