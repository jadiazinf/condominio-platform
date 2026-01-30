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
  return (
    <div>
      <Typography color="muted" variant="caption">
        {translations.assignedTo}
      </Typography>
      {assignedToUser ? (
        <div className="mt-1 space-y-2">
          <UserInfo
            user={assignedToUser}
            showViewProfile
            viewProfileLabel={translations.viewProfile}
          />
          {canManage && (
            <TicketAssignAction
              availableUsers={availableUsers}
              currentAssignedUser={assignedToUser}
              isLoading={isLoading}
              translations={{
                assignUser: translations.assignUser,
                reassignUser: translations.reassignUser,
                noUsersAvailable: translations.noUsersAvailable,
              }}
              onAssign={onAssign}
            />
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <Typography color="muted" variant="body2">
            {translations.notAssigned}
          </Typography>
          {canManage && (
            <TicketAssignAction
              availableUsers={availableUsers}
              isLoading={isLoading}
              translations={{
                assignUser: translations.assignUser,
                reassignUser: translations.reassignUser,
                noUsersAvailable: translations.noUsersAvailable,
              }}
              onAssign={onAssign}
            />
          )}
        </div>
      )}
    </div>
  )
}
