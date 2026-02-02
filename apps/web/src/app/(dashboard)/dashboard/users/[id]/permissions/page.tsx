import { redirect } from 'next/navigation'
import { getTranslations } from '@/libs/i18n/server'
import { getUserFullDetails } from '@packages/http-client/hooks'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { PermissionsTable } from './components/PermissionsTable'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserPermissionsPage({ params }: PageProps) {
  const { id } = await params
  const { t } = await getTranslations()
  const token = await getServerAuthToken()

  // Fetch user data server-side
  const user = await getUserFullDetails(token, id)

  // Server-side redirect for non-superadmins - they shouldn't see this page
  if (!user.isSuperadmin) {
    redirect(`/dashboard/users/${id}`)
  }

  // Get current user ID to check if viewing own profile
  const session = await getFullSession()
  const currentUserId = session?.user?.id

  // Helper to get translated module name
  const getModuleLabel = (module: string) => {
    return module
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper to get translated action name
  const getActionLabel = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.users.detail.permissions.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.users.detail.permissions.subtitle')}
        </Typography>
      </div>

      <PermissionsTable
        userId={user.id}
        currentUserId={currentUserId}
        permissions={user.superadminPermissions || []}
        translations={{
          title: t('superadmin.users.detail.permissions.title'),
          action: t('superadmin.users.detail.permissions.action'),
          description: t('superadmin.users.detail.permissions.description'),
          status: t('superadmin.users.detail.permissions.status'),
          cannotModifyOwn: t('superadmin.users.detail.permissions.cannotModifyOwn'),
          empty: t('superadmin.users.detail.permissions.empty'),
          toggleSuccess: t('superadmin.users.detail.permissions.toggleSuccess'),
          toggleError: t('superadmin.users.detail.permissions.toggleError'),
        }}
        getModuleLabel={getModuleLabel}
        getActionLabel={getActionLabel}
      />
    </div>
  )
}
