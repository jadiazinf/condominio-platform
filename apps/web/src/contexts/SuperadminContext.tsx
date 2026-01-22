'use client'

import type { TSuperadminUser, TPermission, TAllPermissionModule, TPermissionAction } from '@packages/domain'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

import { getSuperadminCookie, getSuperadminPermissionsCookie } from '@/libs/cookies/superadmin-cookie'

interface SuperadminContextType {
  superadmin: TSuperadminUser | null
  permissions: TPermission[]
  setSuperadmin: (superadmin: TSuperadminUser) => void
  setPermissions: (permissions: TPermission[]) => void
  clearSuperadmin: () => void
  isSuperadmin: boolean
  hasPermission: (module: TAllPermissionModule, action: TPermissionAction) => boolean
  hasAnyPermission: (checks: Array<{ module: TAllPermissionModule; action: TPermissionAction }>) => boolean
  hasAllPermissions: (checks: Array<{ module: TAllPermissionModule; action: TPermissionAction }>) => boolean
}

const SuperadminContext = createContext<SuperadminContextType | undefined>(undefined)

interface SuperadminProviderProps {
  children: ReactNode
  initialSuperadmin?: TSuperadminUser | null
  initialPermissions?: TPermission[]
}

// Helper to get initial superadmin from props or cookies
function getInitialSuperadmin(initial: TSuperadminUser | null): TSuperadminUser | null {
  if (initial) return initial

  // Try to read from cookies on client
  if (typeof window !== 'undefined') {
    return getSuperadminCookie()
  }

  return null
}

// Helper to get initial permissions from props or cookies
function getInitialPermissions(initial: TPermission[]): TPermission[] {
  if (initial.length > 0) return initial

  // Try to read from cookies on client
  if (typeof window !== 'undefined') {
    return getSuperadminPermissionsCookie() ?? []
  }

  return []
}

export function SuperadminProvider({
  children,
  initialSuperadmin = null,
  initialPermissions = [],
}: SuperadminProviderProps) {
  const [superadmin, setSuperadminState] = useState<TSuperadminUser | null>(() =>
    getInitialSuperadmin(initialSuperadmin)
  )
  const [permissions, setPermissionsState] = useState<TPermission[]>(() =>
    getInitialPermissions(initialPermissions)
  )

  const setSuperadmin = useCallback((newSuperadmin: TSuperadminUser) => {
    setSuperadminState(newSuperadmin)
  }, [])

  const setPermissions = useCallback((newPermissions: TPermission[]) => {
    setPermissionsState(newPermissions)
  }, [])

  const clearSuperadmin = useCallback(() => {
    setSuperadminState(null)
    setPermissionsState([])
  }, [])

  const isSuperadmin = useMemo(() => {
    return superadmin !== null && superadmin.isActive
  }, [superadmin])

  const hasPermission = useCallback(
    (module: TAllPermissionModule, action: TPermissionAction): boolean => {
      return permissions.some(p => p.module === module && p.action === action)
    },
    [permissions]
  )

  const hasAnyPermission = useCallback(
    (checks: Array<{ module: TAllPermissionModule; action: TPermissionAction }>): boolean => {
      return checks.some(check => hasPermission(check.module, check.action))
    },
    [hasPermission]
  )

  const hasAllPermissions = useCallback(
    (checks: Array<{ module: TAllPermissionModule; action: TPermissionAction }>): boolean => {
      return checks.every(check => hasPermission(check.module, check.action))
    },
    [hasPermission]
  )

  const value = useMemo(
    () => ({
      superadmin,
      permissions,
      setSuperadmin,
      setPermissions,
      clearSuperadmin,
      isSuperadmin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [
      superadmin,
      permissions,
      setSuperadmin,
      setPermissions,
      clearSuperadmin,
      isSuperadmin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    ]
  )

  return <SuperadminContext.Provider value={value}>{children}</SuperadminContext.Provider>
}

export function useSuperadmin() {
  const context = useContext(SuperadminContext)

  if (context === undefined) {
    throw new Error('useSuperadmin must be used within a SuperadminProvider')
  }

  return context
}
