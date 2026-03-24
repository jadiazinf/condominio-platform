import { create } from 'zustand'

interface PushNotificationStore {
  unregister: (() => Promise<void>) | null
  setUnregister: (fn: (() => Promise<void>) | null) => void
}

/**
 * Minimal store to expose the FCM unregister function so that
 * AuthContext (signOut) can clean up push tokens without circular imports.
 */
export const usePushNotificationStore = create<PushNotificationStore>(set => ({
  unregister: null,
  setUnregister: fn => set({ unregister: fn }),
}))
