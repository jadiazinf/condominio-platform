import { redirect } from 'next/navigation'

import { ImportDetailClient } from './components/ImportDetailClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ t }, session, resolvedParams] = await Promise.all([
    getTranslations(),
    getFullSession(),
    params,
  ])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.bankReconciliation.detail'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    backToList: t(`${p}.backToList`),
    summary: t(`${p}.summary`),
    totalEntries: t(`${p}.totalEntries`),
    totalCredits: t(`${p}.totalCredits`),
    totalDebits: t(`${p}.totalDebits`),
    matched: t(`${p}.matched`),
    unmatched: t(`${p}.unmatched`),
    ignored: t(`${p}.ignored`),
    autoMatch: t(`${p}.autoMatch`),
    autoMatching: t(`${p}.autoMatching`),
    autoMatchSuccess: t(`${p}.autoMatchSuccess`),
    autoMatchError: t(`${p}.autoMatchError`),
    table: {
      date: t(`${p}.table.date`),
      reference: t(`${p}.table.reference`),
      description: t(`${p}.table.description`),
      amount: t(`${p}.table.amount`),
      type: t(`${p}.table.type`),
      status: t(`${p}.table.status`),
      actions: t(`${p}.table.actions`),
    },
    entryTypes: {
      credit: t(`${p}.entryTypes.credit`),
      debit: t(`${p}.entryTypes.debit`),
    },
    entryStatuses: {
      unmatched: t(`${p}.entryStatuses.unmatched`),
      matched: t(`${p}.entryStatuses.matched`),
      ignored: t(`${p}.entryStatuses.ignored`),
    },
    actions: {
      match: t(`${p}.actions.match`),
      unmatch: t(`${p}.actions.unmatch`),
      ignore: t(`${p}.actions.ignore`),
    },
    matchDialog: {
      title: t(`${p}.matchDialog.title`),
      subtitle: t(`${p}.matchDialog.subtitle`),
      searchPlaceholder: t(`${p}.matchDialog.searchPlaceholder`),
      noResults: t(`${p}.matchDialog.noResults`),
      selectPayment: t(`${p}.matchDialog.selectPayment`),
      paymentRef: t(`${p}.matchDialog.paymentRef`),
      paymentAmount: t(`${p}.matchDialog.paymentAmount`),
      paymentDate: t(`${p}.matchDialog.paymentDate`),
      matching: t(`${p}.matchDialog.matching`),
      matchSuccess: t(`${p}.matchDialog.matchSuccess`),
      matchError: t(`${p}.matchDialog.matchError`),
    },
    unmatchSuccess: t(`${p}.unmatchSuccess`),
    unmatchError: t(`${p}.unmatchError`),
    ignoreSuccess: t(`${p}.ignoreSuccess`),
    ignoreError: t(`${p}.ignoreError`),
  }

  return <ImportDetailClient importId={resolvedParams.id} translations={translations} />
}
