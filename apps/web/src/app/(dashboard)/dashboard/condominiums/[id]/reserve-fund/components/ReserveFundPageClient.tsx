'use client'

import { Typography } from '@/ui/components/typography'
import { Tabs, Tab } from '@/ui/components/tabs'
import { ReserveFundSummaryCards } from './ReserveFundSummaryCards'
import { ReserveFundConceptsSection } from './ReserveFundConceptsSection'
import { ReserveFundPaymentsSection } from './ReserveFundPaymentsSection'
import { ReserveFundExpensesSection } from './ReserveFundExpensesSection'
import type { TReserveFundTranslations } from './types'

interface ReserveFundPageClientProps {
  condominiumId: string
  managementCompanyId: string
  translations: TReserveFundTranslations
}

export function ReserveFundPageClient({
  condominiumId,
  managementCompanyId,
  translations: t,
}: ReserveFundPageClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="h3">{t.title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t.subtitle}
        </Typography>
      </div>

      {/* Tabs */}
      <Tabs
        size="lg"
        color="primary"
        variant="underlined"
        defaultSelectedKey="summary"
        classNames={{ tabList: 'overflow-x-auto flex-nowrap' }}
      >
        <Tab key="summary" title={t.tabs.summary}>
          <div className="pt-4">
            <ReserveFundSummaryCards
              condominiumId={condominiumId}
              managementCompanyId={managementCompanyId}
              translations={t.summary}
            />
          </div>
        </Tab>
        <Tab key="concepts" title={t.tabs.concepts}>
          <div className="pt-4">
            <ReserveFundConceptsSection
              condominiumId={condominiumId}
              managementCompanyId={managementCompanyId}
              translations={t.concepts}
            />
          </div>
        </Tab>
        <Tab key="payments" title={t.tabs.payments}>
          <div className="pt-4">
            <ReserveFundPaymentsSection
              condominiumId={condominiumId}
              managementCompanyId={managementCompanyId}
              translations={t.payments}
            />
          </div>
        </Tab>
        <Tab key="expenses" title={t.tabs.expenses}>
          <div className="pt-4">
            <ReserveFundExpensesSection
              condominiumId={condominiumId}
              managementCompanyId={managementCompanyId}
              translations={t.expenses}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  )
}
