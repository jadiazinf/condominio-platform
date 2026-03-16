'use client'

import type { TTicketStatus } from '@packages/domain'

import { TicketStatusAction, type ITicketStatusActionTranslations } from '../../TicketStatusAction'
import { getStatusColor } from '../../ticket-helpers'

import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'

interface ITicketStatusSectionProps {
  status: TTicketStatus
  statusLabel: string
  canManage: boolean
  isLoading: boolean
  translations: {
    state: string
    changeStatus: string
    statuses: ITicketStatusActionTranslations['statuses']
  }
  onStatusChange: (status: TTicketStatus) => void
}

export function TicketStatusSection({
  status,
  statusLabel,
  canManage,
  isLoading,
  translations,
  onStatusChange,
}: ITicketStatusSectionProps) {
  return (
    <div>
      <Typography color="muted" variant="caption">
        {translations.state}
      </Typography>
      <div className="mt-1 flex items-center gap-3">
        <Chip color={getStatusColor(status)} variant="flat">
          {statusLabel}
        </Chip>
        {canManage && (
          <TicketStatusAction
            iconOnly
            currentStatus={status}
            isLoading={isLoading}
            translations={{
              changeStatus: translations.changeStatus,
              statuses: translations.statuses,
            }}
            onStatusChange={onStatusChange}
          />
        )}
      </div>
    </div>
  )
}
