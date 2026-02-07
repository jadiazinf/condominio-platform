import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

import { CreateExchangeRateForm } from './components'

async function CreateExchangeRateContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button className="mt-1" href="/dashboard/currencies/exchange-rates" isIconOnly variant="flat">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <Typography variant="h2">
            {t('superadmin.currencies.exchangeRates.form.createTitle')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.currencies.exchangeRates.form.createSubtitle')}
          </Typography>
        </div>
      </div>

      {/* Form */}
      <CreateExchangeRateForm />
    </div>
  )
}

export default async function CreateExchangeRatePage() {
  return (
    <Suspense fallback={<CreateExchangeRatePageSkeleton />}>
      <CreateExchangeRateContent />
    </Suspense>
  )
}

function CreateExchangeRatePageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-default-200" />
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <div className="h-[500px] animate-pulse rounded-lg border border-default-200 bg-default-100" />
    </div>
  )
}
