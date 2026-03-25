import { getCondominiumUsers } from '@packages/http-client/hooks'

import { CondominiumUsersTable } from './components'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumUsersPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([
    getTranslations(),
    getServerAuthToken(),
    getFullSession(),
  ])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? session.managementCompanies?.[0]?.managementCompanyId
      : undefined

  // Fetch users server-side
  let users: Awaited<ReturnType<typeof getCondominiumUsers>> = []

  try {
    users = await getCondominiumUsers(token, id, managementCompanyId)
  } catch (error) {
    console.error('Failed to fetch condominium users:', error)
  }

  // Prepare translations for client components
  const translations = {
    title: t('superadmin.condominiums.detail.users.title'),
    subtitle: t('superadmin.condominiums.detail.users.subtitle'),
    addUser: t('superadmin.condominiums.detail.users.addUser'),
    noUsers: t('superadmin.condominiums.detail.users.noUsers'),
    table: {
      user: t('superadmin.condominiums.detail.users.table.user'),
      roles: t('superadmin.condominiums.detail.users.table.roles'),
      units: t('superadmin.condominiums.detail.users.table.units'),
      status: t('superadmin.condominiums.detail.users.table.status'),
      actions: t('superadmin.condominiums.detail.users.table.actions'),
    },
    status: {
      active: t('common.status.active'),
      inactive: t('common.status.inactive'),
    },
    removeModal: {
      title: t('superadmin.condominiums.detail.users.removeModal.title'),
      confirm: t('superadmin.condominiums.detail.users.removeModal.confirm'),
      warning: t('superadmin.condominiums.detail.users.removeModal.warning'),
      cancel: t('common.cancel'),
      remove: t('superadmin.condominiums.detail.users.removeModal.remove'),
      removing: t('superadmin.condominiums.detail.users.removeModal.removing'),
      success: t('superadmin.condominiums.detail.users.removeModal.success'),
      error: t('superadmin.condominiums.detail.users.removeModal.error'),
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h3">{translations.title}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {translations.subtitle}
          </Typography>
        </div>
      </div>

      <CondominiumUsersTable condominiumId={id} translations={translations} users={users} />
    </div>
  )
}
