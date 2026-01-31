'use client'

import type { TUser } from '@packages/domain'
import { Typography } from '@/ui/components/typography'
import { UserInfo } from '../../UserInfo'
import { TicketAssignAction, type ITicketAssignActionTranslations } from '../../TicketAssignAction'

interface ITicketAssignmentSectionProps {
  assignedToUser: TUser | null
  availableUsers: TUser[]
  canManage: boolean
  isLoading: boolean
  translations: {
    assignedTo: string
    notAssigned: string
    viewProfile: string
    assignUser: string
    reassignUser: string
    noUsersAvailable: string
    searchPlaceholder: string
    tableColumns: {
      name: string
      email: string
      document: string
      actions: string
    }
    select: string
    selected: string
    selectedUser: string
    cancel: string
    confirm: string
  }
  onAssign: (userId: string) => void
}

export function TicketAssignmentSection({
  assignedToUser,
  availableUsers,
  canManage,
  isLoading,
  translations,
  onAssign,
}: ITicketAssignmentSectionProps) {
  const assignAction = canManage ? (
    <TicketAssignAction
      availableUsers={availableUsers}
      currentAssignedUser={assignedToUser ?? undefined}
      iconOnly
      isLoading={isLoading}
      translations={{
        assignUser: translations.assignUser,
        reassignUser: translations.reassignUser,
        noUsersAvailable: translations.noUsersAvailable,
        searchPlaceholder: translations.searchPlaceholder,
        tableColumns: translations.tableColumns,
        select: translations.select,
        selected: translations.selected,
        selectedUser: translations.selectedUser,
        cancel: translations.cancel,
        confirm: translations.confirm,
      }}
      onAssign={onAssign}
    />
  ) : null

  return (
    <div>
      <Typography color="muted" variant="caption">
        {translations.assignedTo}
      </Typography>
      {assignedToUser ? (
        <div className="mt-1">
          <UserInfo
            user={assignedToUser}
            showViewProfile
            viewProfileLabel={translations.viewProfile}
            action={assignAction}
          />
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <Typography color="muted" variant="body2">
            {translations.notAssigned}
          </Typography>
          {assignAction}
        </div>
      )}
    </div>
  )
}
