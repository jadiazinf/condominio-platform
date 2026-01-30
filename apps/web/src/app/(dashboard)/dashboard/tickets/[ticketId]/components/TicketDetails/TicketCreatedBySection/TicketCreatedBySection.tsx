'use client'

import type { TUser } from '@packages/domain'
import { Typography } from '@/ui/components/typography'
import { UserInfo } from '../../UserInfo'

interface ITicketCreatedBySectionProps {
  createdByUser: TUser | null
  translations: {
    createdBy: string
    viewProfile: string
  }
}

export function TicketCreatedBySection({
  createdByUser,
  translations,
}: ITicketCreatedBySectionProps) {
  if (!createdByUser) return null

  return (
    <div>
      <Typography color="muted" variant="caption">
        {translations.createdBy}
      </Typography>
      <div className="mt-1">
        <UserInfo
          user={createdByUser}
          showViewProfile
          viewProfileLabel={translations.viewProfile}
        />
      </div>
    </div>
  )
}
