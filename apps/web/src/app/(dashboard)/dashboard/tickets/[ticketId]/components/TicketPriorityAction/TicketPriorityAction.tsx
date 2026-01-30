'use client'

import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { ChevronDown, AlertCircle } from 'lucide-react'
import type { TTicketPriority } from '@packages/domain'

export interface ITicketPriorityActionTranslations {
  changePriority: string
  priorities: {
    low: string
    medium: string
    high: string
    urgent: string
  }
}

interface ITicketPriorityActionProps {
  currentPriority: TTicketPriority
  translations: ITicketPriorityActionTranslations
  onPriorityChange: (priority: TTicketPriority) => void
  isLoading?: boolean
}

export function TicketPriorityAction({
  currentPriority,
  translations,
  onPriorityChange,
  isLoading = false,
}: ITicketPriorityActionProps) {
  const priorities: TTicketPriority[] = ['low', 'medium', 'high', 'urgent']

  const getPriorityColor = (
    priority: TTicketPriority
  ): 'default' | 'primary' | 'warning' | 'danger' => {
    switch (priority) {
      case 'urgent':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'primary'
      default:
        return 'default'
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          color="default"
          endContent={<ChevronDown size={16} />}
          isDisabled={isLoading}
          size="sm"
          startContent={<AlertCircle size={16} />}
          variant="flat"
        >
          {translations.changePriority}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={translations.changePriority}
        onAction={(key) => onPriorityChange(key as TTicketPriority)}
      >
        {priorities.map((priority) => (
          <DropdownItem
            key={priority}
            color={getPriorityColor(priority)}
            isDisabled={priority === currentPriority}
          >
            {translations.priorities[priority]}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
