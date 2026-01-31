'use client'

import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { TicketPriorityAction, type ITicketPriorityActionTranslations } from '../../TicketPriorityAction'
import { getPriorityColor } from '../../ticket-helpers'
import type { TTicketPriority } from '@packages/domain'

interface ITicketPrioritySectionProps {
  priority: TTicketPriority
  priorityLabel: string
  canManage: boolean
  isLoading?: boolean
  translations: {
    priority: string
    changePriority: string
    priorities: ITicketPriorityActionTranslations['priorities']
  }
  onPriorityChange: (priority: TTicketPriority) => void
}

export function TicketPrioritySection({
  priority,
  priorityLabel,
  canManage,
  isLoading = false,
  translations,
  onPriorityChange,
}: ITicketPrioritySectionProps) {
  return (
    <div>
      <Typography color="muted" variant="caption">
        {translations.priority}
      </Typography>
      <div className="mt-1 flex items-center gap-3">
        <Chip color={getPriorityColor(priority)} variant="flat">
          {priorityLabel}
        </Chip>
        {canManage && (
          <TicketPriorityAction
            currentPriority={priority}
            iconOnly
            isLoading={isLoading}
            translations={{
              changePriority: translations.changePriority,
              priorities: translations.priorities,
            }}
            onPriorityChange={onPriorityChange}
          />
        )}
      </div>
    </div>
  )
}
