'use client'

import type { MessagePayload } from 'firebase/messaging'

import { useCallback } from 'react'
import { useQueryClient } from '@packages/http-client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

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

  usePushNotifications({ onForegroundMessage: handleForegroundMessage })

  return null
}
