'use client'

import { useState, useEffect, useCallback } from 'react'
import { Switch } from '@heroui/switch'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { useToast } from '@/ui/components/toast'
import { updateUserStatus, updateUserRoleStatus } from '@packages/http-client/hooks'
import { useUserDetail } from '../context/UserDetailContext'

export default function UserStatusPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user: firebaseUser } = useAuth()
  const { user, refetch } = useUserDetail()
  const [token, setToken] = useState<string>('')
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const handleUserStatusChange = useCallback(
    async (isActive: boolean) => {
      if (!token) return

      setIsUpdatingUser(true)
      try {
        await updateUserStatus(token, user.id, isActive)
        toast.success(t('superadmin.users.detail.statusSection.success'))
        refetch()
      } catch {
        toast.error(t('superadmin.users.detail.statusSection.error'))
      } finally {
        setIsUpdatingUser(false)
      }
    },
    [token, user.id, refetch, t, toast]
  )

  const handleRoleStatusChange = useCallback(
    async (userRoleId: string, isActive: boolean) => {
      if (!token) return

      setUpdatingRoleId(userRoleId)
      try {
        await updateUserRoleStatus(token, userRoleId, isActive)
        toast.success(t('superadmin.users.detail.statusSection.success'))
        refetch()
      } catch {
        toast.error(t('superadmin.users.detail.statusSection.error'))
      } finally {
        setUpdatingRoleId(null)
      }
    },
    [token, refetch, t, toast]
  )

  const userRoles = user.userRoles || []

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
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Typography variant="h4">
              {t('superadmin.users.detail.statusSection.userLevel')}
            </Typography>
            <Typography color="muted" variant="body2" className="mt-1">
              {t('superadmin.users.detail.statusSection.userLevelDescription')}
            </Typography>
          </div>
          <div className="flex items-center gap-4">
            <Chip color={user.isActive ? 'success' : 'default'} variant="flat">
              {user.isActive
                ? t('superadmin.users.status.active')
                : t('superadmin.users.status.inactive')}
            </Chip>
            <Switch
              isSelected={user.isActive}
              isDisabled={isUpdatingUser}
              onValueChange={handleUserStatusChange}
            />
          </div>
        </div>
      </Card>

      {/* Role Level Status */}
      {userRoles.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <Typography variant="h4">
              {t('superadmin.users.detail.statusSection.roleLevel')}
            </Typography>
            <Typography color="muted" variant="body2" className="mt-1">
              {t('superadmin.users.detail.statusSection.roleLevelDescription')}
            </Typography>
          </div>

          <div className="space-y-4">
            {userRoles.map(role => (
              <div
                key={role.id}
                className="flex items-center justify-between py-3 border-b border-default-100 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Typography variant="body1" className="font-medium">
                      {role.roleName}
                    </Typography>
                    {role.condominiumName && (
                      <Chip size="sm" variant="flat" color="default">
                        {role.condominiumName}
                      </Chip>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Chip color={role.isActive ? 'success' : 'default'} size="sm" variant="flat">
                    {role.isActive
                      ? t('superadmin.users.status.active')
                      : t('superadmin.users.status.inactive')}
                  </Chip>
                  <Switch
                    isSelected={role.isActive}
                    isDisabled={updatingRoleId === role.id}
                    onValueChange={(isActive: boolean) => handleRoleStatusChange(role.id, isActive)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Condominium Level Status - Only for regular users */}
      {!user.isSuperadmin && user.condominiums && user.condominiums.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <Typography variant="h4">
              {t('superadmin.users.detail.statusSection.condominiumLevel')}
            </Typography>
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
                    <div key={index} className="flex items-center gap-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={role.isActive ? 'primary' : 'default'}
                      >
                        {role.roleName}
                      </Chip>
                      <Switch
                        isSelected={role.isActive}
                        isDisabled={updatingRoleId === role.userRoleId}
                        onValueChange={(isActive: boolean) =>
                          handleRoleStatusChange(role.userRoleId, isActive)
                        }
                        size="sm"
                      />
                    </div>
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
