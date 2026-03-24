'use client'

import { useEffect, useState, useCallback } from 'react'
import { Switch } from '@heroui/switch'
import { Bell, BellOff, AlertTriangle } from 'lucide-react'

import { useTranslation, useAuth, useUser } from '@/contexts'
import {
  usePushNotifications,
  isPromptDismissed,
  dismissPrompt,
} from '@/hooks/usePushNotifications'
import { Typography } from '@/ui/components/typography'

type TBrowserPermission = 'default' | 'granted' | 'denied' | 'unsupported'

function getBrowserPermission(): TBrowserPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'

  return Notification.permission as TBrowserPermission
}

interface IPushNotificationToggleProps {
  /** Pre-fetched from the server — true if the user has any active FCM tokens in the DB */
  initialHasActiveTokens: boolean
}

export function PushNotificationToggle({ initialHasActiveTokens }: IPushNotificationToggleProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const { user } = useUser()
  const { isRegistered, isLoading, requestPermissionAndRegister, unregisterFcmToken } =
    usePushNotifications()

  const [browserPermission, setBrowserPermission] = useState<TBrowserPermission>('default')

  useEffect(() => {
    setBrowserPermission(getBrowserPermission())
  }, [])

  // Poll permission status after user action (browser prompt is async)
  const refreshPermission = useCallback(() => {
    const timer = setInterval(() => {
      const current = getBrowserPermission()

      setBrowserPermission(prev => {
        if (prev !== current) {
          clearInterval(timer)

          return current
        }

        return prev
      })
    }, 500)

    setTimeout(() => clearInterval(timer), 30000)

    return () => clearInterval(timer)
  }, [])

  // Use server-fetched value as initial state, then live value once the hook resolves.
  // This prevents the switch from flashing off→on on page load.
  const isEnabled =
    browserPermission === 'granted' && (isRegistered || (!isRegistered && initialHasActiveTokens))
  const isDenied = browserPermission === 'denied'
  const isUnsupported = browserPermission === 'unsupported'

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await requestPermissionAndRegister()
      refreshPermission()

      if (!isPromptDismissed()) {
        dismissPrompt()
      }
    } else {
      await unregisterFcmToken()
    }
  }

  if (isUnsupported) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-default-100 p-4">
        <BellOff className="h-5 w-5 text-default-400" />
        <Typography color="muted" variant="body2">
          {t('settings.notifications.unsupported')}
        </Typography>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main toggle */}
      <div className="flex items-center justify-between rounded-lg border-2 border-default-200 bg-default-50 p-4 dark:bg-default-100/50">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-default-100 p-2">
            <Bell className="h-5 w-5 text-default-600" />
          </div>
          <div>
            <Typography className="font-medium" variant="body1">
              {t('settings.notifications.pushToggleLabel')}
            </Typography>
            <Typography color="muted" variant="body2">
              {isEnabled
                ? t('settings.notifications.pushEnabled')
                : t('settings.notifications.pushDisabled')}
            </Typography>
          </div>
        </div>

        <Switch
          isDisabled={isDenied || isLoading || !firebaseUser || !user?.id}
          isSelected={isEnabled}
          onValueChange={handleToggle}
        />
      </div>

      {/* Denied warning with instructions */}
      {isDenied && (
        <div className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <div>
            <Typography className="font-medium" variant="body2">
              {t('settings.notifications.deniedTitle')}
            </Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {t('settings.notifications.deniedInstructions')}
            </Typography>
          </div>
        </div>
      )}
    </div>
  )
}
