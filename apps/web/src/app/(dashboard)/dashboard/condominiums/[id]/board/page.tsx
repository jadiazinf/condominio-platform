import { BoardMembersClient } from './components/BoardMembersClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumBoardPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? (session.managementCompanies?.[0]?.managementCompanyId ?? '')
      : ''

  const p = 'admin.condominiums.detail.board'

  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    addMember: t(`${p}.addMember`),
    removeMember: t(`${p}.removeMember`),
    empty: t(`${p}.empty`),
    emptyDescription: t(`${p}.emptyDescription`),
    positions: {
      president: t(`${p}.positions.president`),
      secretary: t(`${p}.positions.secretary`),
      treasurer: t(`${p}.positions.treasurer`),
      substitute_president: t(`${p}.positions.substitutePresident`),
      substitute_secretary: t(`${p}.positions.substituteSecretary`),
      substitute_treasurer: t(`${p}.positions.substituteTreasurer`),
    },
    statuses: {
      active: t(`${p}.statuses.active`),
      inactive: t(`${p}.statuses.inactive`),
      replaced: t(`${p}.statuses.replaced`),
    },
    form: {
      createTitle: t(`${p}.form.createTitle`),
      userId: t(`${p}.form.userId`),
      userIdPlaceholder: t(`${p}.form.userIdPlaceholder`),
      position: t(`${p}.form.position`),
      electedAt: t(`${p}.form.electedAt`),
      termEndsAt: t(`${p}.form.termEndsAt`),
      assemblyMinuteId: t(`${p}.form.assemblyMinuteId`),
      notes: t(`${p}.form.notes`),
      notesPlaceholder: t(`${p}.form.notesPlaceholder`),
      create: t(`${p}.form.create`),
      creating: t(`${p}.form.creating`),
      success: t(`${p}.form.success`),
    },
    removeConfirmTitle: t(`${p}.removeConfirmTitle`),
    removeConfirmMessage: t(`${p}.removeConfirmMessage`),
    cancel: t(`${p}.cancel`),
    confirm: t(`${p}.confirm`),
    electedAt: t(`${p}.electedAt`),
    termEndsAt: t(`${p}.termEndsAt`),
  }

  return (
    <BoardMembersClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
