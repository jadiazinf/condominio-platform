'use client'

import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { ChevronDown, UserPlus } from 'lucide-react'
import type { TUser } from '@packages/domain'

export interface ITicketAssignActionTranslations {
  assignUser: string
  reassignUser: string
  noUsersAvailable: string
}

interface ITicketAssignActionProps {
  currentAssignedUser?: TUser
  availableUsers: TUser[]
  translations: ITicketAssignActionTranslations
  onAssign: (userId: string) => void
  isLoading?: boolean
}

export function TicketAssignAction({
  currentAssignedUser,
  availableUsers,
  translations,
  onAssign,
  isLoading = false,
}: ITicketAssignActionProps) {
  const label = currentAssignedUser ? translations.reassignUser : translations.assignUser

  if (availableUsers.length === 0) {
    return (
      <Button color="default" isDisabled size="sm" variant="flat">
        {translations.noUsersAvailable}
      </Button>
    )
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          color="primary"
          endContent={<ChevronDown size={16} />}
          isDisabled={isLoading}
          size="sm"
          startContent={<UserPlus size={16} />}
          variant="flat"
        >
          {label}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label={label} onAction={(key) => onAssign(key as string)}>
        {availableUsers.map((user) => (
          <DropdownItem
            key={user.id}
            description={user.email}
            isDisabled={user.id === currentAssignedUser?.id}
          >
            {user.displayName || user.email}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
