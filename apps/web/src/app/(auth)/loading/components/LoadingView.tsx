'use client'

import { Button } from '@heroui/button'
import { Spinner } from '@heroui/spinner'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface LoadingViewProps {
  error?: string | null
  onRetry?: () => void
  onLogout?: () => void
}

export function LoadingView({ error, onRetry, onLogout }: LoadingViewProps) {
  const { t } = useTranslation()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
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
            {t('auth.loading.error')}
          </Typography>
          <Typography className="max-w-md" color="muted" variant="body2">
            {error}
          </Typography>
        </div>

        <div className="flex gap-4">
          {onRetry && (
            <Button color="primary" variant="solid" onPress={onRetry}>
              {t('auth.loading.retry')}
            </Button>
          )}
          {onLogout && (
            <Button color="default" variant="bordered" onPress={onLogout}>
              {t('auth.loading.logout')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <Spinner color="primary" size="lg" />
      <div className="flex flex-col items-center gap-2 text-center">
        <Typography color="default" variant="h3">
          {t('auth.loading.title')}
        </Typography>
        <Typography color="muted" variant="body2">
          {t('auth.loading.subtitle')}
        </Typography>
      </div>
    </div>
  )
}
