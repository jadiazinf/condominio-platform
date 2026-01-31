'use client'

/**
 * SuperadminContext - Wrapper around the Zustand session store
 *
 * This context re-exports the superadmin hooks from the session store
 * to maintain backwards compatibility with existing components.
 *
 * The Zustand store is the single source of truth for all session data.
 */

import { useSuperadmin as useStoreSuperadmin } from '@/stores/session-store'

// Re-export the hook from the store
export const useSuperadmin = useStoreSuperadmin

// Provider is no longer needed since Zustand manages its own state
// Keep it as a pass-through for backwards compatibility
export function SuperadminProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
