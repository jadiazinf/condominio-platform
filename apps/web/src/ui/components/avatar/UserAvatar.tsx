'use client'

import { Avatar } from '@heroui/avatar'
import { Link } from '@heroui/link'
import type { AvatarProps } from '@heroui/avatar'

export interface UserAvatarProps {
  /** User's display name or full name */
  name?: string | null
  /** User's profile image URL */
  src?: string | null
  /** Avatar size */
  size?: AvatarProps['size']
  /** Link to navigate when clicked */
  href?: string
  /** Whether the avatar is clickable */
  isClickable?: boolean
  /** Additional className */
  className?: string
}

/**
 * UserAvatar - A reusable avatar component for displaying user profile pictures.
 * Optionally links to a profile page when clicked.
 */
export function UserAvatar({
  name,
  src,
  size = 'sm',
  href = '/dashboard/profile',
  isClickable = true,
  className,
}: UserAvatarProps) {
  const avatarElement = (
    <Avatar
      key={src}
      name={name || undefined}
      src={src || undefined}
      size={size}
      className={className}
      isBordered
      color="default"
      classNames={{
        base: isClickable ? 'cursor-pointer transition-transform hover:scale-105' : '',
      }}
      imgProps={{
        crossOrigin: 'anonymous',
        loading: 'eager',
        fetchPriority: 'high',
      }}
    />
  )

  if (isClickable && href) {
    return <Link href={href}>{avatarElement}</Link>
  }

  return avatarElement
}
