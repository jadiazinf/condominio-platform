'use client'

import { DrawerHeader as HeroUIDrawerHeader } from '@heroui/drawer'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { Avatar } from '@heroui/avatar'
import { X } from 'lucide-react'

import { useTranslation, useUser } from '@/contexts'

import type { IBadgeConfig } from './AppDrawer'

interface IDrawerHeaderProps {
  badge?: IBadgeConfig
  onClose: () => void
}

export function DrawerHeader({ badge, onClose }: IDrawerHeaderProps) {
  const { t } = useTranslation()
  const { user } = useUser()

  const displayName =
    user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('common.user')

  return (
    <HeroUIDrawerHeader className="flex flex-col gap-4 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 p-5 text-white">
      <CloseButton onClose={onClose} />
      <Branding badge={badge} />
      <UserInfo displayName={displayName} email={user?.email} photoUrl={user?.photoUrl} />
    </HeroUIDrawerHeader>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end -mt-1 -mr-1">
      <Button
        isIconOnly
        className="text-white/80 hover:text-white hover:bg-white/20"
        radius="full"
        size="sm"
        variant="light"
        onPress={onClose}
      >
        <X size={18} />
      </Button>
    </div>
  )
}

function Branding({ badge }: { badge?: IBadgeConfig }) {
  return (
    <div className="flex items-center gap-2 -mt-2">
      <span className="text-xl font-bold">CondominioApp</span>
      {badge && (
        <Chip
          classNames={{
            base: 'bg-white/20 border-none',
            content: 'text-white font-semibold text-xs',
          }}
          size="sm"
          startContent={badge.icon}
          variant="bordered"
        >
          {badge.label}
        </Chip>
      )}
    </div>
  )
}

interface IUserInfoProps {
  displayName: string
  email?: string
  photoUrl?: string | null
}

function UserInfo({ displayName, email, photoUrl }: IUserInfoProps) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <Avatar
        classNames={{ base: 'ring-2 ring-white/30' }}
        name={displayName}
        size="md"
        src={photoUrl || undefined}
        imgProps={{ crossOrigin: 'anonymous' }}
      />
      <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-semibold truncate">{displayName}</span>
        <span className="text-xs text-white/70 truncate">{email}</span>
      </div>
    </div>
  )
}
