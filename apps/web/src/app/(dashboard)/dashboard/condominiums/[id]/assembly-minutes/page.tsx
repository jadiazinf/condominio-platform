import { AssemblyMinutesListClient } from './components/AssemblyMinutesListClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumAssemblyMinutesPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? (session.managementCompanies?.[0]?.managementCompanyId ?? '')
      : ''

  const p = 'admin.condominiums.detail.assemblyMinutes'

  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    addMinute: t(`${p}.addMinute`),
    empty: t(`${p}.empty`),
    emptyDescription: t(`${p}.emptyDescription`),
    table: {
      title: t(`${p}.table.title`),
      type: t(`${p}.table.type`),
      date: t(`${p}.table.date`),
      quorum: t(`${p}.table.quorum`),
      status: t(`${p}.table.status`),
    },
    types: {
      ordinary: t(`${p}.types.ordinary`),
      extraordinary: t(`${p}.types.extraordinary`),
    },
    status: {
      draft: t(`${p}.status.draft`),
      approved: t(`${p}.status.approved`),
      voided: t(`${p}.status.voided`),
    },
    form: {
      createTitle: t(`${p}.form.createTitle`),
      title: t(`${p}.form.title`),
      titlePlaceholder: t(`${p}.form.titlePlaceholder`),
      assemblyType: t(`${p}.form.assemblyType`),
      assemblyDate: t(`${p}.form.assemblyDate`),
      assemblyLocation: t(`${p}.form.assemblyLocation`),
      assemblyLocationPlaceholder: t(`${p}.form.assemblyLocationPlaceholder`),
      quorumPercentage: t(`${p}.form.quorumPercentage`),
      attendeesCount: t(`${p}.form.attendeesCount`),
      totalUnits: t(`${p}.form.totalUnits`),
      agenda: t(`${p}.form.agenda`),
      agendaPlaceholder: t(`${p}.form.agendaPlaceholder`),
      notes: t(`${p}.form.notes`),
      notesPlaceholder: t(`${p}.form.notesPlaceholder`),
      document: t(`${p}.form.document`),
      documentHint: t(`${p}.form.documentHint`),
      status: t(`${p}.form.status`),
      create: t(`${p}.form.create`),
      creating: t(`${p}.form.creating`),
      success: t(`${p}.form.success`),
    },
  }

  return (
    <AssemblyMinutesListClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
