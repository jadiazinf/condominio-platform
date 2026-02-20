import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'
import { MyRequestsClient } from './MyRequestsClient'

export default async function MyRequestsPage() {
  const { t } = await getTranslations()

  const translations = {
    title: t('resident.myRequests.title'),
    subtitle: t('resident.myRequests.subtitle'),
    noRequests: t('resident.myRequests.noRequests'),
    joinCondominium: t('resident.myRequests.joinCondominium'),
    statusFilter: {
      all: t('admin.accessRequests.tabs.all'),
      pending: t('admin.accessRequests.tabs.pending'),
      approved: t('admin.accessRequests.tabs.approved'),
      rejected: t('admin.accessRequests.tabs.rejected'),
    },
    table: {
      condominium: t('resident.myRequests.table.condominium'),
      building: t('resident.myRequests.table.building'),
      unit: t('resident.myRequests.table.unit'),
      ownershipType: t('resident.myRequests.table.ownershipType'),
      date: t('resident.myRequests.table.date'),
      status: t('resident.myRequests.table.status'),
    },
    status: {
      pending: t('admin.accessRequests.status.pending'),
      approved: t('admin.accessRequests.status.approved'),
      rejected: t('admin.accessRequests.status.rejected'),
    },
    ownershipTypes: {
      owner: t('common.ownershipTypes.owner'),
      tenant: t('common.ownershipTypes.tenant'),
      family_member: t('common.ownershipTypes.family_member'),
      authorized: t('common.ownershipTypes.authorized'),
    },
    detail: {
      title: t('resident.myRequests.detail.title'),
      condominium: t('resident.myRequests.table.condominium'),
      building: t('resident.myRequests.table.building'),
      unit: t('resident.myRequests.table.unit'),
      ownershipType: t('resident.myRequests.table.ownershipType'),
      date: t('resident.myRequests.table.date'),
      status: t('resident.myRequests.table.status'),
      adminNotes: t('resident.myRequests.detail.adminNotes'),
      noAdminNotes: t('resident.myRequests.detail.noAdminNotes'),
      close: t('common.close'),
      statusMessages: {
        pending: t('resident.myRequests.detail.statusMessages.pending'),
        approved: t('resident.myRequests.detail.statusMessages.approved'),
        rejected: t('resident.myRequests.detail.statusMessages.rejected'),
      },
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

      <MyRequestsClient translations={translations} />
    </div>
  )
}
