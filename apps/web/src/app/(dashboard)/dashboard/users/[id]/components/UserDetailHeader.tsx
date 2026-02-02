'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Avatar } from '@/ui/components/avatar-base'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import type { TUserFullDetails } from '@packages/http-client/hooks'

interface IUserDetailHeaderProps {
  user: TUserFullDetails
}

export function UserDetailHeader({ user }: IUserDetailHeaderProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.displayName || user.email

  return (
    <div className="mb-6">
      <Button
        variant="light"
        startContent={<ArrowLeft size={16} />}
        className="mb-4"
        onPress={() => router.push('/dashboard/users')}
      >
        {t('superadmin.users.detail.backToList')}
      </Button>

      <div className="flex items-center gap-4">
        <Avatar name={displayName} size="lg" src={user.photoUrl || undefined} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Typography variant="h2">{displayName}</Typography>
            {user.isSuperadmin && (
              <Chip color="warning" size="sm" variant="flat">
                Superadmin
              </Chip>
            )}
            <Chip color={user.isActive ? 'success' : 'default'} size="sm" variant="flat">
              {user.isActive
                ? t('superadmin.users.status.active')
                : t('superadmin.users.status.inactive')}
            </Chip>
          </div>
          <Typography color="muted" variant="body2" className="mt-1">
            {user.email}
          </Typography>
        </div>
      </div>
    </div>
  )
}
