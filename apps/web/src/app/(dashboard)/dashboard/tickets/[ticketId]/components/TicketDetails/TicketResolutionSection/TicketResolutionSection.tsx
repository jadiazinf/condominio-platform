'use client'

import type { TUser, TTicketStatus } from '@packages/domain'
import { Typography } from '@/ui/components/typography'
import { UserInfo } from '../../UserInfo'
import { TicketResolveAction } from '../../TicketResolveAction'
import { TicketSolutionField } from '../../TicketSolutionField'

interface ITicketResolutionSectionProps {
  resolvedByUser: TUser | null
  resolvedAt: Date | null
  solution: string | null
  canManage: boolean
  status: TTicketStatus
  isLoading: boolean
  translations: {
    resolvedBy: string
    viewProfile: string
    resolveTicket: string
    solution: string
    solutionPlaceholder: string
  }
  onResolve: () => void
  onSaveSolution: (solution: string) => void
}

export function TicketResolutionSection({
  resolvedByUser,
  resolvedAt,
  solution,
  canManage,
  status,
  isLoading,
  translations,
  onResolve,
  onSaveSolution,
}: ITicketResolutionSectionProps) {
  return (
    <>
      {resolvedByUser && (
        <div>
          <Typography color="muted" variant="caption">
            {translations.resolvedBy}
          </Typography>
          <div className="mt-1">
            <UserInfo
              user={resolvedByUser}
              showViewProfile
              viewProfileLabel={translations.viewProfile}
            />
          </div>
        </div>
      )}

      {!resolvedAt && canManage && status !== 'closed' && (
        <div>
          <TicketResolveAction
            isLoading={isLoading}
            label={translations.resolveTicket}
            onResolve={onResolve}
          />
        </div>
      )}

      {canManage && resolvedAt && (
        <div>
          <TicketSolutionField
            label={translations.solution}
            placeholder={translations.solutionPlaceholder}
            solution={solution}
            onSave={onSaveSolution}
          />
        </div>
      )}
    </>
  )
}
