import { redirect } from 'next/navigation'

import { BudgetDetailClient } from './components/BudgetDetailClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BudgetDetailPage({ params }: PageProps) {
  const [{ id }, { t }, session] = await Promise.all([params, getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.budgetDetail'
  const translations = {
    back: t(`${p}.back`),
    loading: t(`${p}.loading`),
    error: t(`${p}.error`),
    tabs: {
      overview: t(`${p}.tabs.overview`),
      vsActual: t(`${p}.tabs.vsActual`),
      quotas: t(`${p}.tabs.quotas`),
    },
    overview: {
      type: t(`${p}.overview.type`),
      period: t(`${p}.overview.period`),
      status: t(`${p}.overview.status`),
      totalAmount: t(`${p}.overview.totalAmount`),
      reserveFund: t(`${p}.overview.reserveFund`),
      items: t(`${p}.overview.items`),
      description: t(`${p}.overview.description`),
      amount: t(`${p}.overview.amount`),
    },
    vsActual: {
      title: t(`${p}.vsActual.title`),
      description: t(`${p}.vsActual.description`),
      budgeted: t(`${p}.vsActual.budgeted`),
      actual: t(`${p}.vsActual.actual`),
      variance: t(`${p}.vsActual.variance`),
      total: t(`${p}.vsActual.total`),
      loading: t(`${p}.vsActual.loading`),
    },
    quotas: {
      title: t(`${p}.quotas.title`),
      calculate: t(`${p}.quotas.calculate`),
      unit: t(`${p}.quotas.unit`),
      aliquot: t(`${p}.quotas.aliquot`),
      amount: t(`${p}.quotas.amount`),
      budgetTotal: t(`${p}.quotas.budgetTotal`),
      reserveFund: t(`${p}.quotas.reserveFund`),
      totalWithReserve: t(`${p}.quotas.totalWithReserve`),
      skippedUnits: t(`${p}.quotas.skippedUnits`),
      loading: t(`${p}.quotas.loading`),
      notActive: t(`${p}.quotas.notActive`),
    },
    statuses: {
      draft: t('admin.budgets.statuses.draft'),
      approved: t('admin.budgets.statuses.approved'),
      active: t('admin.budgets.statuses.active'),
      closed: t('admin.budgets.statuses.closed'),
    },
    types: {
      monthly: t('admin.budgets.types.monthly'),
      quarterly: t('admin.budgets.types.quarterly'),
      annual: t('admin.budgets.types.annual'),
    },
  }

  return <BudgetDetailClient budgetId={id} translations={translations} />
}
