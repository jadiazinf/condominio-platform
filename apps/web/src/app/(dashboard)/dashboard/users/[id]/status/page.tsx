import { getUserFullDetails, getAllPermissions } from '@packages/http-client/hooks'

import { StatusToggle } from './components/StatusToggle'
import { RoleStatusToggle } from './components/RoleStatusToggle'
import { CondominiumRoleToggle } from './components/CondominiumRoleToggle'
import { SuperadminPromotionCard } from './components/SuperadminPromotionCard'

import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { getTranslations } from '@/libs/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserStatusPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([
    getTranslations(),
    getServerAuthToken(),
    getFullSession(),
  ])

  // Fetch user data and permissions server-side
  const user = await getUserFullDetails(token, id)
  const userRoles = user.userRoles || []

  // Fetch all available permissions for superadmin promotion
  const allPermissions = await getAllPermissions(token)

  // Get current user ID to check if viewing own profile
  const currentUserId = session?.user?.id

  // Check if user has superadmin role (active or inactive) or has superadmin permissions
  const hasSuperadminRole = userRoles.some(role => role.roleName.toUpperCase() === 'SUPERADMIN')
  const hasSuperadminPermissions = (user.superadminPermissions?.length ?? 0) > 0
  const isSuperadminUser = user.isSuperadmin || hasSuperadminRole || hasSuperadminPermissions

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.users.detail.statusSection.title')}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('superadmin.users.detail.statusSection.subtitle')}
        </Typography>
      </div>

      {/* User Level Status */}
      <Card className="p-6">
        <StatusToggle
          activeLabel={t('superadmin.users.status.active')}
          description={t('superadmin.users.detail.statusSection.userLevelDescription')}
          errorMessage={t('superadmin.users.detail.statusSection.error')}
          inactiveLabel={t('superadmin.users.status.inactive')}
          initialStatus={user.isActive}
          successMessage={t('superadmin.users.detail.statusSection.success')}
          title={t('superadmin.users.detail.statusSection.userLevel')}
          userId={user.id}
        />
      </Card>

      {/* Superadmin Promotion/Demotion/Permissions */}
      <SuperadminPromotionCard
        availablePermissions={allPermissions}
        cancelButtonText={t('common.cancel')}
        confirmButtonText={t('common.confirm')}
        confirmDemoteText={t('superadmin.users.detail.statusSection.confirmDemote')}
        currentPermissions={user.superadminPermissions || undefined}
        currentUserId={currentUserId}
        demoteButtonText={t('superadmin.users.detail.statusSection.demoteButton')}
        demoteDescription={t('superadmin.users.detail.statusSection.demoteDescription')}
        demoteTitle={t('superadmin.users.detail.statusSection.demoteTitle')}
        errorMessage={t('superadmin.users.detail.statusSection.promotionError')}
        isSuperadmin={isSuperadminUser}
        modalDescription={t('superadmin.users.detail.statusSection.modalDescription')}
        modalTitle={t('superadmin.users.detail.statusSection.modalTitle')}
        noPermissionSelectedText={t('superadmin.users.detail.statusSection.noPermissionSelected')}
        promoteButtonText={t('superadmin.users.detail.statusSection.promoteButton')}
        promoteDescription={t('superadmin.users.detail.statusSection.promoteDescription')}
        promoteTitle={t('superadmin.users.detail.statusSection.promoteTitle')}
        successMessage={t('superadmin.users.detail.statusSection.promotionSuccess')}
        userDisplayName={user.displayName || user.email}
        userId={user.id}
      />

      {/* Role Level Status */}
      {userRoles.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <Typography variant="h4">
              {t('superadmin.users.detail.statusSection.roleLevel')}
            </Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {t('superadmin.users.detail.statusSection.roleLevelDescription')}
            </Typography>
          </div>

          <div className="space-y-4">
            {userRoles.map(role => (
              <RoleStatusToggle
                key={role.id}
                activeLabel={t('superadmin.users.status.active')}
                condominiumName={role.condominiumName ?? undefined}
                errorMessage={t('superadmin.users.detail.statusSection.error')}
                inactiveLabel={t('superadmin.users.status.inactive')}
                initialStatus={role.isActive}
                roleName={role.roleName}
                successMessage={t('superadmin.users.detail.statusSection.success')}
                userId={user.id}
                userRoleId={role.id}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Condominium Level Status - Only for regular users */}
      {!isSuperadminUser && user.condominiums && user.condominiums.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <Typography variant="h4">
              {t('superadmin.users.detail.statusSection.condominiumLevel')}
            </Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {t('superadmin.users.detail.statusSection.condominiumLevelDescription')}
            </Typography>
          </div>

          <div className="space-y-4">
            {user.condominiums.map(condo => (
              <div key={condo.id} className="py-3 border-b border-default-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <Typography className="font-medium" variant="body1">
                    {condo.name}
                  </Typography>
                </div>
                <div className="flex flex-wrap gap-2">
                  {condo.roles.map((role, index) => (
                    <CondominiumRoleToggle
                      key={index}
                      activeLabel={t('superadmin.users.status.active')}
                      errorMessage={t('superadmin.users.detail.statusSection.error')}
                      inactiveLabel={t('superadmin.users.status.inactive')}
                      initialStatus={role.isActive}
                      roleName={role.roleName}
                      successMessage={t('superadmin.users.detail.statusSection.success')}
                      userId={user.id}
                      userRoleId={role.userRoleId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
