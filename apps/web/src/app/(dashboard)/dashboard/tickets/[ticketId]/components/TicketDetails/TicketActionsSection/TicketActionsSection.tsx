'use client'

import type { TUser } from '@packages/domain'

import { Calendar } from 'lucide-react'

import { CloseTicketModal, type ICloseTicketModalTranslations } from '../../CloseTicketModal'
import { UserInfo } from '../../UserInfo'
import { formatDate } from '../../ticket-helpers'

import { Typography } from '@/ui/components/typography'

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
  showCloseButton?: boolean
}

export function TicketActionsSection({
  closedAt,
  closedByUser,
  canManage,
  isLoading,
  locale,
  translations,
  onClose,
  showCloseButton = true,
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
              showViewProfile
              user={closedByUser}
              viewProfileLabel={translations.viewProfile}
            />
          </div>
        </div>
      )}

      {showCloseButton && !closedAt && canManage && (
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
