'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { useTranslation } from '@/contexts'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-danger" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-danger/5 animate-ping" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">{t('errors.error.title')}</h1>
        <p className="text-default-500 mb-8">{t('errors.error.description')}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="font-semibold"
            color="primary"
            size="lg"
            startContent={<RefreshCw className="w-4 h-4" />}
            variant="bordered"
            onPress={reset}
          >
            {t('errors.error.retry')}
          </Button>
          <Link href="/">
            <Button
              className="font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
              color="primary"
              size="lg"
            >
              {t('errors.error.backToHome')}
            </Button>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-default-400">
            {t('errors.error.code', { code: error.digest })}
          </p>
        )}

        <div className="mt-8 flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-danger/40"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
