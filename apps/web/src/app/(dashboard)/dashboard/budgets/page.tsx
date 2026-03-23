import { redirect } from 'next/navigation'

import { BudgetsListClient } from './components/BudgetsListClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function BudgetsPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.budgets'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    create: t(`${p}.create`),
    empty: t(`${p}.empty`),
    loading: t(`${p}.loading`),
    table: {
      name: t(`${p}.table.name`),
      type: t(`${p}.table.type`),
      period: t(`${p}.table.period`),
      totalAmount: t(`${p}.table.totalAmount`),
      status: t(`${p}.table.status`),
      actions: t(`${p}.table.actions`),
    },
    statuses: {
      draft: t(`${p}.statuses.draft`),
      approved: t(`${p}.statuses.approved`),
      active: t(`${p}.statuses.active`),
      closed: t(`${p}.statuses.closed`),
    },
    types: {
      monthly: t(`${p}.types.monthly`),
      quarterly: t(`${p}.types.quarterly`),
      annual: t(`${p}.types.annual`),
    },
  }

  return <BudgetsListClient translations={translations} />
}
