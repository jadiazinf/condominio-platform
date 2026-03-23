import { redirect } from 'next/navigation'

import { GenerateReceiptsClient } from './components/GenerateReceiptsClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function GenerateReceiptsPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.generateReceipts'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    back: t(`${p}.back`),
    form: {
      periodYear: t(`${p}.form.periodYear`),
      periodMonth: t(`${p}.form.periodMonth`),
      currency: t(`${p}.form.currency`),
      budget: t(`${p}.form.budget`),
    },
    bulkGenerate: t(`${p}.bulkGenerate`),
    success: t(`${p}.success`),
    error: t(`${p}.error`),
    result: {
      generated: t(`${p}.result.generated`),
      failed: t(`${p}.result.failed`),
      total: t(`${p}.result.total`),
      errors: t(`${p}.result.errors`),
    },
    months: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [String(i + 1), t(`${p}.months.${i + 1}`)])
    ),
    preview: {
      title: t(`${p}.preview.title`),
      subtitle: t(`${p}.preview.subtitle`),
      unitCount: t(`${p}.preview.unitCount`),
      confirm: t(`${p}.preview.confirm`),
      cancel: t(`${p}.preview.cancel`),
    },
  }

  return <GenerateReceiptsClient translations={translations} />
}
