import Link from 'next/link'

import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'

export default async function NotFound() {
  const { t } = await getTranslations()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-gradient-primary leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/10 animate-pulse" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">{t('errors.notFound.title')}</h1>
        <p className="text-default-500 mb-8">{t('errors.notFound.description')}</p>

        <Link href="/">
          <Button
            className="font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
            color="primary"
            size="lg"
          >
            {t('errors.notFound.backToHome')}
          </Button>
        </Link>

        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
          <div
            className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: '0.1s' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-primary/20 animate-bounce"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
    </div>
  )
}
