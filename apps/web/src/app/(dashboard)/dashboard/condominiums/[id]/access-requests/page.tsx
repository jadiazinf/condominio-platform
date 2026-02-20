import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { AccessRequestsPageClient } from './AccessRequestsPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AccessRequestsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([
    getTranslations(),
    getFullSession(),
  ])

  const managementCompanyId = session?.activeRole === 'management_company'
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

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{translations.title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {translations.subtitle}
        </Typography>
      </div>

      <AccessRequestsPageClient
        condominiumId={id}
        managementCompanyId={managementCompanyId}
        translations={translations}
      />
    </div>
  )
}
