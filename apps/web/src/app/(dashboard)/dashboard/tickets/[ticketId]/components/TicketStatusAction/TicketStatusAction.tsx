'use client'

import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { ChevronDown, Settings } from 'lucide-react'
import type { TTicketStatus } from '@packages/domain'

export interface ITicketStatusActionTranslations {
  changeStatus: string
  statuses: {
    open: string
    in_progress: string
    waiting_customer: string
    resolved: string
    closed: string
    cancelled: string
  }
}

interface ITicketStatusActionProps {
  currentStatus: TTicketStatus
  translations: ITicketStatusActionTranslations
  onStatusChange: (status: TTicketStatus) => void
  isLoading?: boolean
}

export function TicketStatusAction({
  currentStatus,
  translations,
  onStatusChange,
  isLoading = false,
}: ITicketStatusActionProps) {
  const statuses: TTicketStatus[] = [
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed',
    'cancelled',
  ]

  const getStatusColor = (
    status: TTicketStatus
  ): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'open':
        return 'primary'
      case 'in_progress':
        return 'warning'
      case 'waiting_customer':
        return 'default'
      case 'resolved':
        return 'success'
      case 'closed':
        return 'default'
      case 'cancelled':
        return 'danger'
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
          startContent={<Settings size={16} />}
          variant="flat"
        >
          {translations.changeStatus}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={translations.changeStatus}
        onAction={(key) => onStatusChange(key as TTicketStatus)}
      >
        {statuses.map((status) => (
          <DropdownItem
            key={status}
            color={getStatusColor(status)}
            isDisabled={status === currentStatus}
          >
            {translations.statuses[status]}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
