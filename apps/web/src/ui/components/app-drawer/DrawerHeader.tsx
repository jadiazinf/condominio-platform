'use client'

import { DrawerHeader as HeroUIDrawerHeader } from '@heroui/drawer'
import { X } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { Avatar } from '@/ui/components/avatar-base'
import { useTranslation, useUser, useActiveRole } from '@/contexts'

interface IDrawerHeaderProps {
  onClose: () => void
}

export function DrawerHeader({ onClose }: IDrawerHeaderProps) {
  const { t } = useTranslation()
  const { user } = useUser()
  const { activeRole } = useActiveRole()

  const displayName =
    user?.displayName ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    t('common.user')

  const roleLabel = activeRole ? t(`common.activeRoles.${activeRole}`) : null

  return (
    <HeroUIDrawerHeader className="flex flex-col gap-0 p-0">
      <div className="h-[2px] w-full bg-emerald-600 dark:bg-emerald-500" />

      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            classNames={{ base: 'flex-shrink-0' }}
            imgProps={{
              loading: 'eager',
              fetchPriority: 'high',
            }}
            name={displayName}
            size="sm"
            src={user?.photoUrl || undefined}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-default-400 truncate">{user?.email}</span>
            {roleLabel && (
              <span className="text-xs text-emerald-500 font-medium truncate">{roleLabel}</span>
            )}
          </div>
        </div>

        <Button
          isIconOnly
          className="text-default-400 flex-shrink-0"
          size="sm"
          variant="light"
          onPress={onClose}
        >
          <X size={16} />
        </Button>
      </div>

      <div className="h-px w-full bg-divider" />
    </HeroUIDrawerHeader>
  )
}
