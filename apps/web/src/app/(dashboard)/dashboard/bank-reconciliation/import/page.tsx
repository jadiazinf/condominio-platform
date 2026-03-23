import { redirect } from 'next/navigation'

import { ImportBankStatementClient } from './components/ImportBankStatementClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function ImportBankStatementPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.bankReconciliation.import'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    backToList: t(`${p}.backToList`),
    bankAccount: t(`${p}.bankAccount`),
    bankAccountPlaceholder: t(`${p}.bankAccountPlaceholder`),
    selectFile: t(`${p}.selectFile`),
    changeFile: t(`${p}.changeFile`),
    preview: t(`${p}.preview`),
    previewDesc: t(`${p}.previewDesc`),
    entriesFound: t(`${p}.entriesFound`),
    columnMapping: t(`${p}.columnMapping`),
    columnMappingDesc: t(`${p}.columnMappingDesc`),
    col: {
      transactionDate: t(`${p}.col.transactionDate`),
      reference: t(`${p}.col.reference`),
      description: t(`${p}.col.description`),
      amount: t(`${p}.col.amount`),
      entryType: t(`${p}.col.entryType`),
      balance: t(`${p}.col.balance`),
    },
    autoDetected: t(`${p}.autoDetected`),
    skipColumn: t(`${p}.skipColumn`),
    importing: t(`${p}.importing`),
    importBtn: t(`${p}.importBtn`),
    success: t(`${p}.success`),
    error: t(`${p}.error`),
    noFile: t(`${p}.noFile`),
    noBankAccount: t(`${p}.noBankAccount`),
    emptyFile: t(`${p}.emptyFile`),
  }

  return <ImportBankStatementClient translations={translations} />
}
