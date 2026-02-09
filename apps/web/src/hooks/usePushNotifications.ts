'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/libs/firebase'
import { useAuth, useUser } from '@/contexts'
import { useApiMutation } from '@packages/http-client'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''

type TPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported'

interface IPushNotificationState {
  permission: TPermissionStatus
  isRegistered: boolean
  isLoading: boolean
}

export function usePushNotifications(options?: { onForegroundMessage?: (payload: MessagePayload) => void }) {
  const { user: firebaseUser } = useAuth()
  const { user } = useUser()
  const [state, setState] = useState<IPushNotificationState>({
    permission: typeof window !== 'undefined' && 'Notification' in window
      ? (Notification.permission as TPermissionStatus)
      : 'unsupported',
    isRegistered: false,
    isLoading: false,
  })
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const { mutateAsync: registerToken } = useApiMutation<unknown, { token: string; platform: string }>({
    path: `/user-fcm-tokens/user/${user?.id}/register`,
    method: 'POST',
  })

  const requestPermissionAndRegister = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (!firebaseUser || !user?.id) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const permission = await Notification.requestPermission()
      setState(prev => ({ ...prev, permission: permission as TPermissionStatus }))

      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }

      const messaging = getFirebaseMessaging()
      if (!messaging) {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }

      // Register the service worker for Firebase Messaging
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      })

      if (token) {
        await registerToken({ token, platform: 'web' })
        setState(prev => ({ ...prev, isRegistered: true, isLoading: false }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('Push notification registration failed:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [firebaseUser, user?.id, registerToken])

  // Listen for foreground messages
  useEffect(() => {
    if (state.permission !== 'granted' || !state.isRegistered) return

    const messaging = getFirebaseMessaging()
    if (!messaging) return

    const unsubscribe = onMessage(messaging, (payload) => {
      options?.onForegroundMessage?.(payload)
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      unsubscribe()
      unsubscribeRef.current = null
    }
  }, [state.permission, state.isRegistered, options?.onForegroundMessage])

  // Auto-register if permission already granted
  useEffect(() => {
    if (state.permission === 'granted' && !state.isRegistered && !state.isLoading && firebaseUser && user?.id) {
      requestPermissionAndRegister()
    }
  }, [state.permission, state.isRegistered, state.isLoading, firebaseUser, user?.id])

  return {
    ...state,
    requestPermissionAndRegister,
  }
}
