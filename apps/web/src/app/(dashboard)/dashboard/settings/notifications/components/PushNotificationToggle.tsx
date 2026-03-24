'use client'

import { useEffect, useState } from 'react'
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
  const { isRegistered, isLoading, error, requestPermissionAndRegister, unregisterFcmToken } =
    usePushNotifications()

  // Start with 'default' to match SSR, then update on mount to avoid hydration mismatch
  const [browserPermission, setBrowserPermission] = useState<TBrowserPermission>('default')
  // Track whether user has explicitly toggled, so we stop relying on stale server prop
  const [hasUserToggled, setHasUserToggled] = useState(false)

  useEffect(() => {
    setBrowserPermission(getBrowserPermission())
  }, [])

  // Use server-fetched value as initial state, then live value once the hook resolves.
  // Once the user toggles, we rely solely on isRegistered from the hook.
  const isEnabled =
    browserPermission === 'granted' &&
    (hasUserToggled ? isRegistered : isRegistered || initialHasActiveTokens)
  const isDenied = browserPermission === 'denied'
  const isUnsupported = browserPermission === 'unsupported'

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await requestPermissionAndRegister()
      setBrowserPermission(getBrowserPermission())
      setHasUserToggled(true)

      if (!isPromptDismissed()) {
        dismissPrompt()
      }
    } else {
      await unregisterFcmToken()
      setHasUserToggled(true)
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

      {/* Registration error */}
      {error && !isDenied && (
        <div className="flex items-start gap-3 rounded-lg border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600 dark:text-danger-400" />
          <div>
            <Typography className="font-medium" variant="body2">
              {t('settings.notifications.errorTitle')}
            </Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {t('settings.notifications.errorDescription')}
            </Typography>
          </div>
        </div>
      )}

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
