'use client'

import type { TUserRole, TPermission } from '@packages/domain'

import { useEffect, useRef } from 'react'

import { useSuperadmin } from '@/contexts'

interface SuperadminHydrationProps {
  superadmin: TUserRole | null
  permissions: TPermission[]
}

/**
 * Hydrates the client-side superadmin store from server data.
 * Only sets data if the store is empty to avoid overwriting user actions.
 */
export function SuperadminHydration({ superadmin, permissions }: SuperadminHydrationProps) {
  const {
    superadmin: currentSuperadmin,
    permissions: currentPermissions,
    setSuperadmin,
    setPermissions,
  } = useSuperadmin()

  const hasHydrated = useRef(false)

  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    // Hydrate superadmin if store is empty
    if (!currentSuperadmin && superadmin) {
      setSuperadmin(superadmin)
    }

    // Hydrate permissions if store is empty
    if ((!currentPermissions || currentPermissions.length === 0) && permissions.length > 0) {
      setPermissions(permissions)
    }
  }, [
    superadmin,
    permissions,
    currentSuperadmin,
    currentPermissions,
    setSuperadmin,
    setPermissions,
  ])

  return null
}
