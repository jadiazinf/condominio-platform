'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/ui/components/button'
import { Progress } from '@/ui/components/progress'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { clearSessionCookie, clearUserCookie } from '@/libs/cookies'
import { useAuth } from '@/contexts'

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 2000 // 2 seconds
const MAX_DELAY_MS = 10000 // 10 seconds

interface RetryState {
  attempt: number
  status: 'retrying' | 'success' | 'failed'
  error?: string
}

type RecoveryResult = 'success' | 'retry' | 'logout'

async function attemptSessionRecovery(): Promise<RecoveryResult> {
  try {
    const response = await fetch('/api/session/validate', {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      return data.valid ? 'success' : 'logout'
    }

    // 503 means temporary error - should retry
    if (response.status === 503) {
      return 'retry'
    }

    // Other errors - logout
    return 'logout'
  } catch {
    // Network errors - should retry
    return 'retry'
  }
}

export default function SessionRecoveryPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [state, setState] = useState<RetryState>({
    attempt: 0,
    status: 'retrying',
  })
  const isRecovering = useRef(false)
  const hasStarted = useRef(false)

  const handleLogout = useCallback(async () => {
    clearSessionCookie()
    clearUserCookie()
    await signOut().catch(() => {})
    router.replace('/signin')
  }, [signOut, router])

  const startRecovery = useCallback(async () => {
    if (isRecovering.current) return
    isRecovering.current = true

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      setState({ attempt, status: 'retrying' })

      // Exponential backoff: 2s, 4s, 8s (capped at MAX_DELAY_MS)
      const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS)

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay))

      const result = await attemptSessionRecovery()

      if (result === 'success') {
        setState({ attempt, status: 'success' })
        // Redirect to dashboard on success
        window.location.href = '/dashboard'
        return
      }

      if (result === 'logout') {
        // Session is invalid - logout immediately
        await handleLogout()
        return
      }

      // result === 'retry' - continue to next attempt
    }

    // All retries failed
    setState({
      attempt: MAX_RETRIES,
      status: 'failed',
      error: t('sessionRecovery.failed'),
    })
    isRecovering.current = false
  }, [t, handleLogout])

  const handleRetry = useCallback(() => {
    setState({ attempt: 0, status: 'retrying' })
    isRecovering.current = false
    startRecovery()
  }, [startRecovery])

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      startRecovery()
    }
  }, [startRecovery])

  // Show error state with retry/logout options
  if (state.status === 'failed') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-4 bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <Typography color="default" variant="h3">
            {t('sessionRecovery.errorTitle')}
          </Typography>
          <Typography className="max-w-md" color="muted" variant="body2">
            {t('sessionRecovery.errorDescription')}
          </Typography>
        </div>

        <div className="flex gap-4">
          <Button color="primary" variant="solid" onPress={handleRetry}>
            {t('sessionRecovery.retry')}
          </Button>
          <Button color="default" variant="bordered" onPress={handleLogout}>
            {t('sessionRecovery.logout')}
          </Button>
        </div>
      </div>
    )
  }

  // Show loading state with progress
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-4 bg-background">
      <Progress aria-label="Recovering session..." className="max-w-md" color="primary" isIndeterminate />
      <div className="flex flex-col items-center gap-2 text-center">
        <Typography color="default" variant="h4">
          {t('sessionRecovery.title')}
        </Typography>
        <Typography color="muted" variant="body2">
          {t('sessionRecovery.subtitle')}
        </Typography>
        {state.attempt > 0 && (
          <Typography color="muted" variant="caption">
            {t('sessionRecovery.attempt', { current: state.attempt, max: MAX_RETRIES })}
          </Typography>
        )}
      </div>
    </div>
  )
}
