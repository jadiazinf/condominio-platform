'use client'

import type { TSupportTicket, TUser, TTicketStatus, TTicketPriority } from '@packages/domain'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'
import { Typography } from '@/ui/components/typography'
import { useSuperadmin, useUser } from '@/stores/session-store'
import { useAssignTicket, useResolveTicket, useCloseTicket, useUpdateTicketStatus } from '@packages/http-client'
import { useToast } from '@/ui/components/toast'
import type { ITicketPriorityActionTranslations } from '../TicketPriorityAction'
import type { ITicketStatusActionTranslations } from '../TicketStatusAction'
import type { ICloseTicketModalTranslations } from '../CloseTicketModal'
import { TicketStatusSection } from './TicketStatusSection'
import { TicketPrioritySection } from './TicketPrioritySection'
import { TicketCategorySection } from './TicketCategorySection'
import { TicketDatesSection } from './TicketDatesSection'
import { TicketCreatedBySection } from './TicketCreatedBySection'
import { TicketAssignmentSection } from './TicketAssignmentSection'
import { TicketResolutionSection } from './TicketResolutionSection'
import { TicketActionsSection } from './TicketActionsSection'

export interface ITicketDetailsTranslations {
  title: string
  state: string
  priority: string
  category: string
  created: string
  createdBy: string
  assignedTo: string
  resolved: string
  resolvedBy: string
  solution: string
  solutionPlaceholder: string
  closed: string
  closedBy: string
  viewProfile: string
  notAssigned: string
  assignUser: string
  reassignUser: string
  noUsersAvailable: string
  resolveTicket: string
  closeTicket: string
  closeTicketModal: ICloseTicketModalTranslations
  changeStatus: string
  changePriority: string
  priorities: ITicketPriorityActionTranslations['priorities']
  statuses: ITicketStatusActionTranslations['statuses']
}

export interface ITicketDetailsProps {
  ticket: TSupportTicket
  locale: string
  translations: ITicketDetailsTranslations
  statusLabels: Record<string, string>
  priorityLabels: Record<string, string>
  categoryLabels: Record<string, string>
  availableUsers?: TUser[]
}

export function TicketDetails({
  ticket,
  locale,
  translations,
  statusLabels,
  priorityLabels,
  categoryLabels,
  availableUsers = [],
}: ITicketDetailsProps) {
  const { isSuperadmin } = useSuperadmin()
  const { user } = useUser()
  const toast = useToast()

  const statusLabel = statusLabels[ticket.status.toLowerCase()] || ticket.status
  const priorityLabel = priorityLabels[ticket.priority.toLowerCase()] || ticket.priority
  const categoryLabel = ticket.category
    ? categoryLabels[ticket.category.toLowerCase()] || ticket.category
    : categoryLabels.general

  const canManageTicket = isSuperadmin

  // Debug log
  console.log('🔍 Ticket Management Access:', {
    isSuperadmin,
    canManageTicket,
    user: user?.email,
    ticket: ticket.id,
  })

  // Mutation hooks
  const assignMutation = useAssignTicket(ticket.id, ticket.managementCompanyId)
  const resolveMutation = useResolveTicket(ticket.id, ticket.managementCompanyId)
  const closeMutation = useCloseTicket(ticket.id, ticket.managementCompanyId)
  const updateStatusMutation = useUpdateTicketStatus(ticket.id, ticket.managementCompanyId)

  // Action handlers
  const handleAssign = (userId: string) => {
    if (!user) return
    assignMutation.mutate({ assignedTo: userId })
  }

  const handleResolve = () => {
    if (!user) return
    resolveMutation.mutate({ resolvedBy: user.id })
  }

  const handleClose = (solution: string) => {
    if (!user) return
    closeMutation.mutate({ closedBy: user.id, solution })
  }

  const handleStatusChange = (status: TTicketStatus) => {
    updateStatusMutation.mutate({ status })
  }

  const handlePriorityChange = (priority: TTicketPriority) => {
    // TODO: Implement priority change mutation
    toast.show(`Priority change to ${priority} coming soon`)
  }

  const handleSaveSolution = (solution: string) => {
    // TODO: Implement solution update mutation
    toast.show('Solution update coming soon')
  }

  return (
    <Card>
      <CardHeader>
        <Typography variant="subtitle1">{translations.title}</Typography>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        <TicketStatusSection
          status={ticket.status}
          statusLabel={statusLabel}
          canManage={canManageTicket}
          isLoading={updateStatusMutation.isPending}
          translations={{
            state: translations.state,
            changeStatus: translations.changeStatus,
            statuses: translations.statuses,
          }}
          onStatusChange={handleStatusChange}
        />

        <TicketPrioritySection
          priority={ticket.priority}
          priorityLabel={priorityLabel}
          canManage={canManageTicket}
          translations={{
            priority: translations.priority,
            changePriority: translations.changePriority,
            priorities: translations.priorities,
          }}
          onPriorityChange={handlePriorityChange}
        />

        <TicketCategorySection
          category={ticket.category}
          categoryLabel={categoryLabel}
          translations={{
            category: translations.category,
          }}
        />

        <Divider />

        <TicketDatesSection
          createdAt={ticket.createdAt}
          resolvedAt={ticket.resolvedAt}
          locale={locale}
          translations={{
            created: translations.created,
            resolved: translations.resolved,
          }}
        />

        <TicketCreatedBySection
          createdByUser={ticket.createdByUser}
          translations={{
            createdBy: translations.createdBy,
            viewProfile: translations.viewProfile,
          }}
        />

        <TicketAssignmentSection
          assignedToUser={ticket.currentAssignment?.assignedToUser || null}
          availableUsers={availableUsers}
          canManage={canManageTicket}
          isLoading={assignMutation.isPending}
          translations={{
            assignedTo: translations.assignedTo,
            notAssigned: translations.notAssigned,
            viewProfile: translations.viewProfile,
            assignUser: translations.assignUser,
            reassignUser: translations.reassignUser,
            noUsersAvailable: translations.noUsersAvailable,
          }}
          onAssign={handleAssign}
        />

        <TicketResolutionSection
          resolvedByUser={ticket.resolvedByUser}
          resolvedAt={ticket.resolvedAt}
          solution={ticket.solution}
          canManage={canManageTicket}
          status={ticket.status}
          isLoading={resolveMutation.isPending}
          translations={{
            resolvedBy: translations.resolvedBy,
            viewProfile: translations.viewProfile,
            resolveTicket: translations.resolveTicket,
            solution: translations.solution,
            solutionPlaceholder: translations.solutionPlaceholder,
          }}
          onResolve={handleResolve}
          onSaveSolution={handleSaveSolution}
        />

        <TicketActionsSection
          closedAt={ticket.closedAt}
          closedByUser={ticket.closedByUser}
          canManage={canManageTicket}
          isLoading={closeMutation.isPending}
          locale={locale}
          translations={{
            closed: translations.closed,
            closedBy: translations.closedBy,
            viewProfile: translations.viewProfile,
            closeTicketModal: translations.closeTicketModal,
          }}
          onClose={handleClose}
        />
      </CardBody>
    </Card>
  )
}
