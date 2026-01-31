import Link from 'next/link'
import type { TUser } from '@packages/domain'
import type { ReactNode } from 'react'
import { User, Mail, Phone, ExternalLink } from 'lucide-react'

import { Typography } from '@/ui/components/typography'

export interface IUserInfoProps {
  user: TUser
  showViewProfile?: boolean
  viewProfileLabel?: string
  action?: ReactNode
}

export function UserInfo({ user, showViewProfile = false, viewProfileLabel, action }: IUserInfoProps) {
  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.displayName || user.email

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="text-default-400" size={16} />
          <Typography variant="body2">{displayName}</Typography>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {showViewProfile && viewProfileLabel && (
            <Link
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              href={`/dashboard/users/${user.id}`}
            >
              {viewProfileLabel}
              <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="text-default-400" size={16} />
        <Typography variant="body2">{user.email}</Typography>
      </div>
      {user.phoneNumber && (
        <div className="flex items-center gap-2">
          <Phone className="text-default-400" size={16} />
          <Typography variant="body2">
            {user.phoneCountryCode
              ? `${user.phoneCountryCode} ${user.phoneNumber}`
              : user.phoneNumber}
          </Typography>
        </div>
      )}
    </div>
  )
}
