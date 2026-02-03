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
      />
    </div>
  )
}
