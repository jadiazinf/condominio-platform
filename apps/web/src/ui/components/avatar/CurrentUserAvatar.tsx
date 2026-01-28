'use client'

import type { TUser } from '@packages/domain'

import { Avatar, type IAvatarProps } from '@/ui/components/avatar-base'
import { Link } from '@/ui/components/link'

import { useUser } from '@/contexts'

export interface CurrentUserAvatarProps {
  /** Avatar size */
  size?: IAvatarProps['size']
  /** Whether clicking the avatar navigates to settings (default: false) */
  isClickable?: boolean
  /** Whether to show border */
  isBordered?: boolean
  /** Additional className */
  className?: string
  /** Initial user data from server to prevent flash on first render */
  initialUser?: TUser | null
}

/**
 * CurrentUserAvatar - Displays the current logged-in user's avatar.
 * Gets user data from the context internally.
 */
export function CurrentUserAvatar({
  size = 'sm',
  isClickable = false,
  isBordered = true,
  className,
  initialUser,
}: CurrentUserAvatarProps) {
  const { user: contextUser } = useUser()
  const user = contextUser || initialUser

  const displayName = getDisplayName()

  function getDisplayName(): string {
    if (!user) return ''
    if (user.displayName) return user.displayName
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    return fullName || user.email || ''
  }

  const avatarElement = (
    <Avatar
      key={user?.photoUrl}
      name={displayName || undefined}
      src={user?.photoUrl || undefined}
      size={size}
      className={className}
      isBordered={isBordered}
      color="default"
      classNames={{
        base: isClickable ? 'cursor-pointer transition-transform hover:scale-105' : '',
      }}
      imgProps={{
        loading: 'eager',
        fetchPriority: 'high',
      }}
    />
  )

  if (isClickable) {
    return <Link href="/dashboard/settings">{avatarElement}</Link>
  }

  return avatarElement
}
