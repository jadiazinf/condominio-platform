'use client'

import type { TSupportTicket, TPaginationMeta } from '@packages/domain'

import { useI18n } from '@/contexts'
import { SupportTicketsTable } from './components'

interface AdminTicketsPageClientProps {
  companyId: string
  tickets: TSupportTicket[]
  pagination: TPaginationMeta
}

export function AdminTicketsPageClient({
  companyId,
  tickets,
  pagination,
}: AdminTicketsPageClientProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">{t('tickets.title')}</h1>
        <p className="mt-2 text-sm text-default-500">{t('tickets.subtitle')}</p>
      </div>

      <SupportTicketsTable companyId={companyId} tickets={tickets} pagination={pagination} />
    </div>
  )
}
