'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { getToken, onMessage, deleteToken, type MessagePayload } from 'firebase/messaging'
import { useApiMutation, useQueryClient } from '@packages/http-client'

import { getFirebaseMessaging } from '@/libs/firebase'
import { useAuth, useUser } from '@/contexts'
import { env } from '@/config/env'

const VAPID_KEY = env.get('NEXT_PUBLIC_FIREBASE_VAPID_KEY') || ''

const FIREBASE_CONFIG = {
  apiKey: env.get('NEXT_PUBLIC_FIREBASE_API_KEY') || '',
  authDomain: env.get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || '',
  projectId: env.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || '',
  storageBucket: env.get('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || '',
  messagingSenderId: env.get('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || '',
  appId: env.get('NEXT_PUBLIC_FIREBASE_APP_ID') || '',
}
const TOKEN_STORAGE_KEY = 'fcm_token_registered'
const PROMPT_DISMISSED_KEY = 'fcm_prompt_dismissed'

type TPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported'

interface IPushNotificationState {
  permission: TPermissionStatus
  isRegistered: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Registers the Firebase Messaging service worker and retrieves an FCM token.
 * Isolated so callers don't need to worry about messaging setup.
 */
async function getOrCreateFcmToken(): Promise<string | null> {
  const messaging = getFirebaseMessaging()

  if (!messaging) {
    console.error('[Push] Firebase Messaging not available')

    return null
  }

  // Register the Firebase Messaging service worker
  const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

  await navigator.serviceWorker.ready

  // Send Firebase config to the SW so it can handle background messages
  if (swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'FIREBASE_CONFIG',
      config: FIREBASE_CONFIG,
    })
  }

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  })

  if (!token) {
    console.error('[Push] getToken returned empty — check VAPID key and Firebase config')
  }

  return token || null
}

/**
 * Checks if the user previously dismissed the notification prompt.
 * Once dismissed, the banner never shows again — the user manages
 * notifications from Settings → Notifications.
 */
export function isPromptDismissed(): boolean {
  if (typeof window === 'undefined') return true

  return localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true'
}

export function dismissPrompt(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
  }
}

export function usePushNotifications(options?: {
  onForegroundMessage?: (payload: MessagePayload) => void
}) {
  const { user: firebaseUser } = useAuth()
  const { user } = useUser()
  const [state, setState] = useState<IPushNotificationState>({
    permission:
      typeof window !== 'undefined' && 'Notification' in window
        ? (Notification.permission as TPermissionStatus)
        : 'unsupported',
    isRegistered: false,
    isLoading: false,
    error: null,
  })
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const registrationInProgressRef = useRef(false)
  const autoRegisterAttemptedRef = useRef(false)
  const queryClient = useQueryClient()

  const { mutateAsync: registerTokenApi } = useApiMutation<
    unknown,
    { token: string; platform: string }
  >({
    path: `/me/fcm-tokens/user/${user?.id}/register`,
    method: 'POST',
  })

  const { mutateAsync: unregisterTokenApi } = useApiMutation<unknown, { token: string }>({
    path: `/me/fcm-tokens/user/${user?.id}/unregister`,
    method: 'POST',
  })

  /**
   * Core registration: gets FCM token and sends it to the backend.
   * Handles token refresh by always re-registering (backend upserts).
   */
  const registerFcmToken = useCallback(async () => {
    if (!firebaseUser || !user?.id) return
    if (registrationInProgressRef.current) return

    registrationInProgressRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const token = await getOrCreateFcmToken()

      if (!token) {
        setState(prev => ({ ...prev, isLoading: false, error: 'no_token' }))
        registrationInProgressRef.current = false

        return
      }

      // Always register — backend upserts, so this handles token refresh
      await registerTokenApi({ token, platform: 'web' })

      // Persist token locally so we can unregister on logout
      localStorage.setItem(TOKEN_STORAGE_KEY, token)

      setState(prev => ({ ...prev, isRegistered: true, isLoading: false, error: null }))

      // Invalidate the tokens query so the settings switch reflects the new state
      queryClient.invalidateQueries({ queryKey: ['fcm-tokens'] })
    } catch (error) {
      console.error('[Push] Registration failed:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'registration_failed' }))
    } finally {
      registrationInProgressRef.current = false
    }
  }, [firebaseUser, user?.id, registerTokenApi])

  /**
   * Requests browser notification permission, then registers the token.
   * This is the main entry point for UI-triggered registration.
   */
  const requestPermissionAndRegister = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (!firebaseUser || !user?.id) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const permission = await Notification.requestPermission()

      setState(prev => ({ ...prev, permission: permission as TPermissionStatus }))

      if (permission !== 'granted') return

      await registerFcmToken()
    } catch (error) {
      console.error('[Push] Permission request failed:', error)
      setState(prev => ({ ...prev, error: 'permission_failed' }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [firebaseUser, user?.id, registerFcmToken])

  /**
   * Unregisters the FCM token from backend and deletes it from Firebase.
   * Called on logout to stop receiving notifications on this device.
   */
  const unregisterFcmToken = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)

      if (storedToken && user?.id) {
        await unregisterTokenApi({ token: storedToken }).catch(() => {
          // Backend may fail if token already deleted — that's OK
        })
      }

      // Delete token from Firebase to stop receiving messages
      const messaging = getFirebaseMessaging()

      if (messaging) {
        await deleteToken(messaging).catch(() => {
          // May fail if no token exists — that's OK
        })
      }

      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setState(prev => ({ ...prev, isRegistered: false }))

      queryClient.invalidateQueries({ queryKey: ['fcm-tokens'] })
    } catch (error) {
      console.error('[Push] Unregister failed:', error)
    }
  }, [user?.id, unregisterTokenApi, queryClient])

  // Listen for foreground messages
  useEffect(() => {
    if (state.permission !== 'granted' || !state.isRegistered) return

    const messaging = getFirebaseMessaging()

    if (!messaging) return

    const unsubscribe = onMessage(messaging, payload => {
      options?.onForegroundMessage?.(payload)
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      unsubscribe()
      unsubscribeRef.current = null
    }
  }, [state.permission, state.isRegistered, options?.onForegroundMessage])

  // Auto-register once per session if permission already granted.
  // This ensures token refresh happens (FCM tokens can rotate).
  // Uses a ref to prevent infinite retry loops when token acquisition fails.
  useEffect(() => {
    if (
      state.permission === 'granted' &&
      !state.isRegistered &&
      !state.isLoading &&
      !autoRegisterAttemptedRef.current &&
      firebaseUser &&
      user?.id
    ) {
      autoRegisterAttemptedRef.current = true
      registerFcmToken()
    }
  }, [
    state.permission,
    state.isRegistered,
    state.isLoading,
    firebaseUser,
    user?.id,
    registerFcmToken,
  ])

  // Re-register when the tab becomes visible (handles token rotation after long sleep)
  useEffect(() => {
    if (state.permission !== 'granted' || !firebaseUser || !user?.id) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !registrationInProgressRef.current) {
        registerFcmToken()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [state.permission, firebaseUser, user?.id, registerFcmToken])

  return {
    ...state,
    requestPermissionAndRegister,
    unregisterFcmToken,
  }
}
