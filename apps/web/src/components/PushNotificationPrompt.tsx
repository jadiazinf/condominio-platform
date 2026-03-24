'use client'

import { useEffect, useState } from 'react'
import { Button } from '@heroui/button'

import { useAuth, useUser, useTranslation } from '@/contexts'
import { isPromptDismissed, dismissPrompt } from '@/hooks/usePushNotifications'

interface IPushNotificationPromptProps {
  /** Pre-fetched from server — true if user already has active FCM tokens */
  hasActiveTokens: boolean
}

/**
 * One-time floating banner shown after login when the user hasn't
 * granted or denied notification permission yet AND has no active tokens.
 *
 * After the first interaction (accept / dismiss), all further
 * management happens from Settings → Notifications.
 */
export function PushNotificationPrompt({ hasActiveTokens }: IPushNotificationPromptProps) {
  const { user: firebaseUser } = useAuth()
  const { user } = useUser()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (!firebaseUser || !user?.id) return

    // Don't show if user already has tokens registered (from any device)
    if (hasActiveTokens) return

    const permission = Notification.permission

    if (permission === 'default' && !isPromptDismissed()) {
      const timer = setTimeout(() => setVisible(true), 2000)

      return () => clearTimeout(timer)
    }
  }, [firebaseUser, user?.id, hasActiveTokens])

  if (!visible) return null

  const handleEnable = async () => {
    setLoading(true)

    try {
      await Notification.requestPermission()

      // Regardless of result, dismiss the prompt — user made a choice.
      // The PushNotificationManager hook will auto-register if granted.
      dismissPrompt()
      setVisible(false)
    } catch {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    dismissPrompt()
    setVisible(false)
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-appearance-in sm:left-auto"
      role="alert"
    >
      <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-white p-4 shadow-lg dark:border-primary-800 dark:bg-content1">
        {/* Bell icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary dark:bg-primary-900/40">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('pushNotifications.prompt.title')}
          </p>
          <p className="mt-0.5 text-xs text-default-500">
            {t('pushNotifications.prompt.description')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              color="primary"
              isLoading={loading}
              size="sm"
              onPress={handleEnable}
            >
              {t('pushNotifications.prompt.enable')}
            </Button>
            <Button
              size="sm"
              variant="light"
              onPress={handleDismiss}
            >
              {t('pushNotifications.prompt.later')}
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          aria-label={t('common.close')}
          className="shrink-0 rounded-full p-1 text-default-400 hover:text-default-600"
          onClick={handleDismiss}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
