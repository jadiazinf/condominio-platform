'use client'

import { useUser, useTranslation } from '@/contexts'
import { CurrentUserAvatar } from '@/ui/components/avatar'

export function UserProfileHeader() {
  const { user } = useUser()
  const { t } = useTranslation()

  const displayName = getUserDisplayName()

  function getUserDisplayName(): string {
    if (!user) return t('common.user')

    if (user.displayName) return user.displayName

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()

    return fullName || t('common.user')
  }

  return (
    <header className="flex items-center gap-4 pb-6 border-b border-divider">
      <CurrentUserAvatar className="w-16 h-16" isBordered={false} />
      <UserInfo name={displayName} email={user?.email} />
    </header>
  )
}

function UserInfo({ name, email }: { name: string; email?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold">{name}</span>
      <span className="text-sm text-default-500">{email}</span>
    </div>
  )
}
