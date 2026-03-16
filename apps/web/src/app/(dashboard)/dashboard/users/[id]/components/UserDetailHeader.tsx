'use client'

import type { TUserFullDetails } from '@packages/http-client/hooks'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Avatar } from '@/ui/components/avatar-base'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'

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
        className="mb-4"
        startContent={<ArrowLeft size={16} />}
        variant="light"
        onPress={() => router.push('/dashboard/users')}
      >
        {t('superadmin.users.detail.backToList')}
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar
          className="shrink-0"
          name={displayName}
          size="lg"
          src={user.photoUrl || undefined}
        />
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <Typography className="text-2xl sm:text-3xl truncate" variant="h2">
              {displayName}
            </Typography>
            <div className="flex items-center gap-2 flex-wrap">
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
          </div>
          <Typography className="break-all sm:break-normal" color="muted" variant="body2">
            {user.email}
          </Typography>
        </div>
      </div>
    </div>
  )
}
