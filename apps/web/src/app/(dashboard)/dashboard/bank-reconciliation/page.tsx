import { redirect } from 'next/navigation'

import { BankReconciliationClient } from './components/BankReconciliationClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function BankReconciliationPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.bankReconciliation'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    importBtn: t(`${p}.importBtn`),
    newReconciliation: t(`${p}.newReconciliation`),
    empty: t(`${p}.empty`),
    loading: t(`${p}.loading`),
    tabs: {
      imports: t(`${p}.tabs.imports`),
      reconciliations: t(`${p}.tabs.reconciliations`),
    },
    importsTable: {
      filename: t(`${p}.importsTable.filename`),
      period: t(`${p}.importsTable.period`),
      entries: t(`${p}.importsTable.entries`),
      credits: t(`${p}.importsTable.credits`),
      debits: t(`${p}.importsTable.debits`),
      status: t(`${p}.importsTable.status`),
    },
    reconciliationsTable: {
      period: t(`${p}.reconciliationsTable.period`),
      matched: t(`${p}.reconciliationsTable.matched`),
      unmatched: t(`${p}.reconciliationsTable.unmatched`),
      ignored: t(`${p}.reconciliationsTable.ignored`),
      status: t(`${p}.reconciliationsTable.status`),
    },
    statuses: {
      processing: t(`${p}.statuses.processing`),
      completed: t(`${p}.statuses.completed`),
      failed: t(`${p}.statuses.failed`),
      in_progress: t(`${p}.statuses.inProgress`),
      cancelled: t(`${p}.statuses.cancelled`),
    },
  }

  return <BankReconciliationClient translations={translations} />
}
