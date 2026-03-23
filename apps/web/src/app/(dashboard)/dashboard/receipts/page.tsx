import { redirect } from 'next/navigation'

import { ReceiptsListClient } from './components/ReceiptsListClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function ReceiptsPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.receipts'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    generate: t(`${p}.generate`),
    bulkGenerate: t(`${p}.bulkGenerate`),
    empty: t(`${p}.empty`),
    loading: t(`${p}.loading`),
    table: {
      receiptNumber: t(`${p}.table.receiptNumber`),
      unit: t(`${p}.table.unit`),
      period: t(`${p}.table.period`),
      totalAmount: t(`${p}.table.totalAmount`),
      status: t(`${p}.table.status`),
    },
    statuses: {
      draft: t(`${p}.statuses.draft`),
      generated: t(`${p}.statuses.generated`),
      sent: t(`${p}.statuses.sent`),
      voided: t(`${p}.statuses.voided`),
    },
  }

  return <ReceiptsListClient translations={translations} />
}
