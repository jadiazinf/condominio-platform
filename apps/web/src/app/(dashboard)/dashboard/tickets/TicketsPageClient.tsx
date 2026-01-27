'use client'

import type { TSupportTicket, TPaginationMeta } from '@packages/domain'

import { useI18n } from '@/contexts'
import { AllTicketsTable } from './components'

interface TicketsPageClientProps {
  tickets: TSupportTicket[]
  pagination: TPaginationMeta
}

export function TicketsPageClient({ tickets, pagination }: TicketsPageClientProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">{t('tickets.title')}</h1>
        <p className="mt-2 text-sm text-default-500">{t('tickets.subtitle')}</p>
      </div>

      <AllTicketsTable tickets={tickets} pagination={pagination} />
    </div>
  )
}
