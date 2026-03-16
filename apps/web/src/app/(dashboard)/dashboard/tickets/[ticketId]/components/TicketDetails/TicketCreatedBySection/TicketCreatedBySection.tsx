'use client'

import type { TUser } from '@packages/domain'

import { UserInfo } from '../../UserInfo'

import { Typography } from '@/ui/components/typography'

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
          showViewProfile
          user={createdByUser}
          viewProfileLabel={translations.viewProfile}
        />
      </div>
    </div>
  )
}
