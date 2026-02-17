import { Suspense } from 'react'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

async function TermsConditionsLayoutContent({ children }: { children: React.ReactNode }) {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div>
        <Typography variant="h2">{t('superadmin.terms.title')}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('superadmin.terms.subtitle')}
        </Typography>
      </div>

      {/* Page Content */}
      {children}
    </div>
  )
}

export default async function TermsConditionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto space-y-6">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-default-200" />
            <div className="mt-2 h-4 w-80 animate-pulse rounded bg-default-200" />
          </div>
          {children}
        </div>
      }
    >
      <TermsConditionsLayoutContent>{children}</TermsConditionsLayoutContent>
    </Suspense>
  )
}
