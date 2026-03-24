'use client'

import { useEffect, useState } from 'react'
import { Button } from '@heroui/button'

import { useAuth, useUser, useTranslation } from '@/contexts'
import { isPromptDismissed, dismissPrompt } from '@/hooks/usePushNotifications'
import {
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'

interface IPushNotificationPromptProps {
  /** Pre-fetched from server — true if user already has active FCM tokens */
  hasActiveTokens: boolean
}

/**
 * One-time modal shown after login when the user hasn't granted
 * or denied notification permission yet AND has no active tokens.
 *
 * Renders as a centered modal on desktop and a bottom sheet on mobile.
 *
 * After the first interaction (accept / dismiss), all further
 * management happens from Settings → Notifications.
 */
export function PushNotificationPrompt({ hasActiveTokens }: IPushNotificationPromptProps) {
  const { user: firebaseUser } = useAuth()
  const { user } = useUser()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (!firebaseUser || !user?.id) return
    if (hasActiveTokens) return

    const permission = Notification.permission

    if (permission === 'default' && !isPromptDismissed()) {
      const timer = setTimeout(() => setIsOpen(true), 2000)

      return () => clearTimeout(timer)
    }
  }, [firebaseUser, user?.id, hasActiveTokens])

  const handleEnable = async () => {
    setLoading(true)

    try {
      await Notification.requestPermission()
      dismissPrompt()
      setIsOpen(false)
    } catch {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    dismissPrompt()
    setIsOpen(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      placement="auto"
      size="sm"
      onClose={handleDismiss}
      onOpenChange={open => {
        if (!open) handleDismiss()
      }}
    >
      <ModalContent>
        <ModalBody className="pt-8 pb-2">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary dark:bg-primary-900/40">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold text-foreground">
              {t('pushNotifications.prompt.title')}
            </p>
            <p className="mt-2 text-sm text-default-500">
              {t('pushNotifications.prompt.description')}
            </p>
          </div>
        </ModalBody>

        <ModalFooter className="flex-col gap-2 px-6 pb-6">
          <Button
            className="w-full"
            color="primary"
            isLoading={loading}
            size="lg"
            onPress={handleEnable}
          >
            {t('pushNotifications.prompt.enable')}
          </Button>
          <Button
            className="w-full"
            size="lg"
            variant="light"
            onPress={handleDismiss}
          >
            {t('pushNotifications.prompt.later')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
