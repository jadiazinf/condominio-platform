'use client'

import type { MessagePayload } from 'firebase/messaging'

import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@packages/http-client'

import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePushNotificationStore } from '@/stores/push-notification-store'

export function PushNotificationManager() {
  const queryClient = useQueryClient()

  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      const { title, body } = payload.notification || {}

      // Show browser notification for foreground messages
      if (title && Notification.permission === 'granted') {
        new Notification(title, {
          body: body || '',
          icon: '/icons/icon-192x192.png',
        })
      }

      // Invalidate notification queries to refresh the bell badge
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    [queryClient]
  )

  const { unregisterFcmToken, isRegistered, permission } = usePushNotifications({
    onForegroundMessage: handleForegroundMessage,
  })

  // Expose unregister function to the store so AuthContext can call it on logout
  useEffect(() => {
    usePushNotificationStore.getState().setUnregister(unregisterFcmToken)

    return () => {
      usePushNotificationStore.getState().setUnregister(null)
    }
  }, [unregisterFcmToken])

  // Log registration status in dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Push] Status:', { permission, isRegistered })
    }
  }, [permission, isRegistered])

  return null
}
