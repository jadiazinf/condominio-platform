import type { TCondominiumAccessCode } from '@packages/domain'

import { getActiveAccessCode } from '@packages/http-client/hooks'

import { AccessCodeSection } from '../buildings/components'

import { AccessRequestsPageClient } from './AccessRequestsPageClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession, getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AccessRequestsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session, token] = await Promise.all([
    getTranslations(),
    getFullSession(),
    getServerAuthToken(),
  ])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? session.managementCompanies?.[0]?.managementCompanyId
      : undefined

  const translations = {
    title: t('admin.accessRequests.title'),
    subtitle: t('admin.accessRequests.subtitle'),
    noRequests: t('admin.accessRequests.noRequests'),
    searchPlaceholder: t('admin.accessRequests.searchPlaceholder'),
    statusFilter: {
      all: t('admin.accessRequests.tabs.all'),
      pending: t('admin.accessRequests.tabs.pending'),
      approved: t('admin.accessRequests.tabs.approved'),
      rejected: t('admin.accessRequests.tabs.rejected'),
    },
    table: {
      user: t('admin.accessRequests.table.user'),
      unit: t('admin.accessRequests.table.unit'),
      building: t('admin.accessRequests.table.building'),
      ownershipType: t('admin.accessRequests.table.ownershipType'),
      date: t('admin.accessRequests.table.date'),
      status: t('admin.accessRequests.table.status'),
      actions: t('admin.accessRequests.table.actions'),
    },
    status: {
      pending: t('admin.accessRequests.status.pending'),
      approved: t('admin.accessRequests.status.approved'),
      rejected: t('admin.accessRequests.status.rejected'),
    },
    actions: {
      approve: t('admin.accessRequests.actions.approve'),
      reject: t('admin.accessRequests.actions.reject'),
      approveConfirm: t('admin.accessRequests.actions.approveConfirm'),
      rejectTitle: t('admin.accessRequests.actions.rejectTitle'),
      rejectNotesPlaceholder: t('admin.accessRequests.actions.rejectNotesPlaceholder'),
      cancel: t('common.cancel'),
      confirm: t('common.confirm'),
    },
    success: {
      approved: t('admin.accessRequests.success.approved'),
      rejected: t('admin.accessRequests.success.rejected'),
    },
    error: {
      review: t('admin.accessRequests.error.review'),
      notBelongsToCondominium: t('admin.accessRequests.error.notBelongsToCondominium'),
      alreadyReviewed: t('admin.accessRequests.error.alreadyReviewed'),
      notFound: t('admin.accessRequests.error.notFound'),
    },
    ownershipTypes: {
      owner: t('common.ownershipTypes.owner'),
      tenant: t('common.ownershipTypes.tenant'),
      family_member: t('common.ownershipTypes.family_member'),
      authorized: t('common.ownershipTypes.authorized'),
    },
    detail: {
      title: t('admin.accessRequests.detail.title'),
      name: t('admin.accessRequests.detail.name'),
      email: t('admin.accessRequests.detail.email'),
      phone: t('admin.accessRequests.detail.phone'),
      identityDocument: t('admin.accessRequests.detail.identityDocument'),
      building: t('admin.accessRequests.detail.building'),
      unit: t('admin.accessRequests.detail.unit'),
      ownershipType: t('admin.accessRequests.detail.ownershipType'),
      date: t('admin.accessRequests.detail.date'),
      status: t('admin.accessRequests.detail.status'),
      adminNotes: t('admin.accessRequests.detail.adminNotes'),
      noPhone: t('admin.accessRequests.detail.noPhone'),
      noDocument: t('admin.accessRequests.detail.noDocument'),
    },
  }

  // Fetch active access code
  let activeAccessCode: TCondominiumAccessCode | null = null

  try {
    activeAccessCode = await getActiveAccessCode(token, id, managementCompanyId).catch(() => null)
  } catch {
    // If fetch fails, show no code
  }

  const accessCodeTranslations = {
    title: t('admin.accessCodes.title'),
    noCode: t('admin.accessCodes.noCode'),
    generate: t('admin.accessCodes.generate'),
    regenerate: t('admin.accessCodes.regenerate'),
    expiresLabel: t('admin.accessCodes.expiresLabel'),
    copiedMessage: t('admin.accessCodes.copiedMessage'),
    modal: {
      title: t('admin.accessCodes.modal.title'),
      warning: t('admin.accessCodes.modal.warning'),
      validity: t('admin.accessCodes.modal.validity'),
      validityOptions: {
        '1_day': t('admin.accessCodes.modal.validity1Day'),
        '7_days': t('admin.accessCodes.modal.validity7Days'),
        '1_month': t('admin.accessCodes.modal.validity1Month'),
        '1_year': t('admin.accessCodes.modal.validity1Year'),
      },
      cancel: t('common.cancel'),
      generate: t('admin.accessCodes.generate'),
      generating: t('admin.accessCodes.generating'),
      success: t('admin.accessCodes.success'),
      error: t('admin.accessCodes.error'),
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{translations.title}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {translations.subtitle}
        </Typography>
      </div>

      <AccessCodeSection
        condominiumId={id}
        initialCode={activeAccessCode}
        translations={accessCodeTranslations}
      />

      <AccessRequestsPageClient
        condominiumId={id}
        managementCompanyId={managementCompanyId}
        translations={translations}
      />
    </div>
  )
}
