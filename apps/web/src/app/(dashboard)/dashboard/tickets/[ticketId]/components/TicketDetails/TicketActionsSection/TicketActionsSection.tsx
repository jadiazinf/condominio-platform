'use client'

import { CloseTicketModal, type ICloseTicketModalTranslations } from '../../CloseTicketModal'
import { Typography } from '@/ui/components/typography'
import { Calendar } from 'lucide-react'
import { UserInfo } from '../../UserInfo'
import { formatDate } from '../../ticket-helpers'
import type { TUser } from '@packages/domain'

interface ITicketActionsSectionProps {
  closedAt: Date | null
  closedByUser: TUser | null
  canManage: boolean
  isLoading: boolean
  locale: string
  translations: {
    closed: string
    closedBy: string
    viewProfile: string
    closeTicketModal: ICloseTicketModalTranslations
  }
  onClose: (solution: string) => void
}

export function TicketActionsSection({
  closedAt,
  closedByUser,
  canManage,
  isLoading,
  locale,
  translations,
  onClose,
}: ITicketActionsSectionProps) {
  return (
    <>
      {closedAt && (
        <div>
          <Typography color="muted" variant="caption">
            {translations.closed}
          </Typography>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="text-default-400" size={16} />
            <Typography variant="body2">{formatDate(closedAt, locale)}</Typography>
          </div>
        </div>
      )}

      {closedByUser && (
        <div>
          <Typography color="muted" variant="caption">
            {translations.closedBy}
          </Typography>
          <div className="mt-1">
            <UserInfo
              user={closedByUser}
              showViewProfile
              viewProfileLabel={translations.viewProfile}
            />
          </div>
        </div>
      )}

      {!closedAt && canManage && (
        <div>
          <CloseTicketModal
            isLoading={isLoading}
            translations={translations.closeTicketModal}
            onConfirm={onClose}
          />
        </div>
      )}
    </>
  )
}
