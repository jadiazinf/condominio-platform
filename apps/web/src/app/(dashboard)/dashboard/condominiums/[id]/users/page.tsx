import type { TCondominiumAccessCode } from '@packages/domain'

import { getCondominiumUsers, getActiveAccessCode } from '@packages/http-client/hooks'

import { AccessCodeSection } from '../buildings/components'

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

  const isAdmin = session?.activeRole === 'management_company'

  // Fetch users and access code server-side
  let users: Awaited<ReturnType<typeof getCondominiumUsers>> = []
  let activeAccessCode: TCondominiumAccessCode | null = null

  try {
    const [usersResult, codeResult] = await Promise.all([
      getCondominiumUsers(token, id),
      getActiveAccessCode(token, id, managementCompanyId).catch(() => null),
    ])

    users = usersResult
    activeAccessCode = codeResult
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
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{translations.title}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {translations.subtitle}
          </Typography>
        </div>
      </div>

      {isAdmin && (
        <AccessCodeSection
          condominiumId={id}
          initialCode={activeAccessCode}
          translations={accessCodeTranslations}
        />
      )}

      <CondominiumUsersTable condominiumId={id} translations={translations} users={users} />
    </div>
  )
}
