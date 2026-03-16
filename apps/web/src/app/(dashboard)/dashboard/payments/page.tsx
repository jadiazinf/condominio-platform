import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

import { PaymentsTable } from './components/PaymentsTable'
import { PaymentsTableSkeleton } from './components/PaymentsTableSkeleton'

import { Typography } from '@/ui/components/typography'
import { Link } from '@/ui/components/link'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

async function PaymentsContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const isAdmin = session.activeRole === 'management_company'

  if (!isAdmin && !session.condominiums?.length) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('admin.payments.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.payments.subtitle')}
          </Typography>
        </div>
        {isAdmin && (
          <Link
            className="inline-flex items-center gap-2 rounded-medium bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            href="/dashboard/payments/register"
            underline="none"
          >
            <Plus size={16} />
            {t('admin.payments.register.button')}
          </Link>
        )}
      </div>

      {/* Payments Table */}
      <PaymentsTable />
    </div>
  )
}

export default async function PaymentsPage() {
  return (
    <Suspense fallback={<PaymentsPageSkeleton />}>
      <PaymentsContent />
    </Suspense>
  )
}

function PaymentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <PaymentsTableSkeleton />
    </div>
  )
}
