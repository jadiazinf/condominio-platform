'use client'

import { Button } from '@/ui/components/button'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

type TLoadingStep = 'auth' | 'user' | 'condominiums'

interface LoadingViewProps {
  error?: string | null
  onRetry?: () => void
  onLogout?: () => void
  step?: TLoadingStep
  isSigningOut?: boolean
}

export function LoadingView({
  error,
  onRetry,
  onLogout,
  step = 'auth',
  isSigningOut = false,
}: LoadingViewProps) {
  const { t } = useTranslation()

  if (error) {
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4 bg-background overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated ring + icon */}
        <div className="relative w-20 h-20">
          {/* Outer rotating arc */}
          <svg
            className="absolute inset-0 w-20 h-20 animate-[spin_3s_linear_infinite]"
            fill="none"
            viewBox="0 0 80 80"
          >
            <circle
              className="text-default-200/50"
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              className="text-primary"
              d="M40 4a36 36 0 0 1 36 36"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>

          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite]">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                {isSigningOut ? (
                  <>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </>
                ) : (
                  <>
                    <rect height="20" rx="2" width="16" x="4" y="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Typography variant="h4">
            {isSigningOut ? t('auth.loading.signingOut') : t('auth.loading.title')}
          </Typography>
          <Typography color="muted" variant="body2">
            {isSigningOut ? t('auth.loading.signingOutSubtitle') : t('auth.loading.subtitle')}
          </Typography>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[bounce_1.2s_ease-in-out_infinite]" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[bounce_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[bounce_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  )
}
