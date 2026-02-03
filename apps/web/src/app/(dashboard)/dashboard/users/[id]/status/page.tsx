import { getTranslations } from '@/libs/i18n/server'
import { getUserFullDetails, getAllPermissions } from '@packages/http-client/hooks'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { StatusToggle } from './components/StatusToggle'
import { RoleStatusToggle } from './components/RoleStatusToggle'
import { CondominiumRoleToggle } from './components/CondominiumRoleToggle'
import { SuperadminPromotionCard } from './components/SuperadminPromotionCard'

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
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.users.detail.statusSection.subtitle')}
        </Typography>
      </div>

      {/* User Level Status */}
      <Card className="p-6">
        <StatusToggle
          userId={user.id}
          initialStatus={user.isActive}
          activeLabel={t('superadmin.users.status.active')}
          inactiveLabel={t('superadmin.users.status.inactive')}
          title={t('superadmin.users.detail.statusSection.userLevel')}
          description={t('superadmin.users.detail.statusSection.userLevelDescription')}
          successMessage={t('superadmin.users.detail.statusSection.success')}
          errorMessage={t('superadmin.users.detail.statusSection.error')}
        />
      </Card>

      {/* Superadmin Promotion/Demotion/Permissions */}
      <SuperadminPromotionCard
        userId={user.id}
        currentUserId={currentUserId}
        userDisplayName={user.displayName || user.email}
        isSuperadmin={isSuperadminUser}
        availablePermissions={allPermissions}
        currentPermissions={user.superadminPermissions || undefined}
        promoteTitle={t('superadmin.users.detail.statusSection.promoteTitle')}
        promoteDescription={t('superadmin.users.detail.statusSection.promoteDescription')}
        demoteTitle={t('superadmin.users.detail.statusSection.demoteTitle')}
        demoteDescription={t('superadmin.users.detail.statusSection.demoteDescription')}
        promoteButtonText={t('superadmin.users.detail.statusSection.promoteButton')}
        demoteButtonText={t('superadmin.users.detail.statusSection.demoteButton')}
        modalTitle={t('superadmin.users.detail.statusSection.modalTitle')}
        modalDescription={t('superadmin.users.detail.statusSection.modalDescription')}
        selectAllText={t('superadmin.users.detail.statusSection.selectAll')}
        confirmButtonText={t('common.confirm')}
        cancelButtonText={t('common.cancel')}
        successMessage={t('superadmin.users.detail.statusSection.promotionSuccess')}
        errorMessage={t('superadmin.users.detail.statusSection.promotionError')}
        noPermissionSelectedText={t('superadmin.users.detail.statusSection.noPermissionSelected')}
        confirmDemoteText={t('superadmin.users.detail.statusSection.confirmDemote')}
      />

      {/* Role Level Status */}
      {userRoles.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <Typography variant="h4">{t('superadmin.users.detail.statusSection.roleLevel')}</Typography>
            <Typography color="muted" variant="body2" className="mt-1">
              {t('superadmin.users.detail.statusSection.roleLevelDescription')}
            </Typography>
          </div>

          <div className="space-y-4">
            {userRoles.map(role => (
              <RoleStatusToggle
                key={role.id}
                userId={user.id}
                userRoleId={role.id}
                roleName={role.roleName}
                condominiumName={role.condominiumName ?? undefined}
                initialStatus={role.isActive}
                activeLabel={t('superadmin.users.status.active')}
                inactiveLabel={t('superadmin.users.status.inactive')}
                successMessage={t('superadmin.users.detail.statusSection.success')}
                errorMessage={t('superadmin.users.detail.statusSection.error')}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Condominium Level Status - Only for regular users */}
      {!isSuperadminUser && user.condominiums && user.condominiums.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <Typography variant="h4">{t('superadmin.users.detail.statusSection.condominiumLevel')}</Typography>
            <Typography color="muted" variant="body2" className="mt-1">
              {t('superadmin.users.detail.statusSection.condominiumLevelDescription')}
            </Typography>
          </div>

          <div className="space-y-4">
            {user.condominiums.map(condo => (
              <div key={condo.id} className="py-3 border-b border-default-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="body1" className="font-medium">
                    {condo.name}
                  </Typography>
                </div>
                <div className="flex flex-wrap gap-2">
                  {condo.roles.map((role, index) => (
                    <CondominiumRoleToggle
                      key={index}
                      userId={user.id}
                      userRoleId={role.userRoleId}
                      roleName={role.roleName}
                      initialStatus={role.isActive}
                      activeLabel={t('superadmin.users.status.active')}
                      inactiveLabel={t('superadmin.users.status.inactive')}
                      successMessage={t('superadmin.users.detail.statusSection.success')}
                      errorMessage={t('superadmin.users.detail.statusSection.error')}
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
