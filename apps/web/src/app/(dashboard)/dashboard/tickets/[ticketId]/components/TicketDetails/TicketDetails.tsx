'use client'

import { useRouter } from 'next/navigation'
import type { TSupportTicket, TUser, TTicketStatus, TTicketPriority } from '@packages/domain'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'
import { Typography } from '@/ui/components/typography'
import { useSuperadmin, useUser } from '@/stores/session-store'
import {
  useAssignTicket,
  useResolveTicket,
  useCloseTicket,
  useUpdateTicketStatus,
  useUpdateTicket,
} from '@packages/http-client'
import { useToast } from '@/ui/components/toast'
import type { ITicketPriorityActionTranslations } from '../TicketPriorityAction'
import type { ITicketStatusActionTranslations } from '../TicketStatusAction'
import { CloseTicketModal, type ICloseTicketModalTranslations } from '../CloseTicketModal'
import { TicketResolveAction } from '../TicketResolveAction'
import { CancelTicketAction } from '../CancelTicketAction'
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
  assignSearchPlaceholder: string
  assignTableColumns: {
    name: string
    email: string
    document: string
    actions: string
  }
  assignSelect: string
  assignSelected: string
  assignSelectedUser: string
  assignCancel: string
  assignConfirm: string
  resolveTicket: string
  closeTicket: string
  cancelTicket: string
  closeTicketModal: ICloseTicketModalTranslations
  changeStatus: string
  changePriority: string
  priorities: ITicketPriorityActionTranslations['priorities']
  statuses: ITicketStatusActionTranslations['statuses']
  toast: {
    assignLoading: string
    assignSuccess: string
    assignError: string
    resolveLoading: string
    resolveSuccess: string
    resolveError: string
    closeLoading: string
    closeSuccess: string
    closeError: string
    cancelLoading: string
    cancelSuccess: string
    cancelError: string
    statusLoading: string
    statusSuccess: string
    statusError: string
    priorityLoading: string
    prioritySuccess: string
    priorityError: string
  }
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
  const router = useRouter()
  const { isSuperadmin } = useSuperadmin()
  const { user } = useUser()
  const toast = useToast()

  const statusLabel = statusLabels[ticket.status.toLowerCase()] || ticket.status
  const priorityLabel = priorityLabels[ticket.priority.toLowerCase()] || ticket.priority
  const categoryLabel = ticket.category
    ? categoryLabels[ticket.category.toLowerCase()] || ticket.category
    : categoryLabels.general

  const canManageTicket = isSuperadmin

  // Mutation hooks
  const assignMutation = useAssignTicket(ticket.id, ticket.managementCompanyId)
  const resolveMutation = useResolveTicket(ticket.id, ticket.managementCompanyId)
  const closeMutation = useCloseTicket(ticket.id, ticket.managementCompanyId)
  const updateStatusMutation = useUpdateTicketStatus(ticket.id, ticket.managementCompanyId)
  const updateTicketMutation = useUpdateTicket(ticket.id, ticket.managementCompanyId)

  // Helper to extract error message from API response
  const getErrorMessage = (error: Error, fallback: string): string => {
    return error.message || fallback
  }

  // Action handlers with toast.promise - refresh page after success
  const handleAssign = (userId: string) => {
    if (!user) return
    toast.promise(
      assignMutation.mutateAsync({ assignedTo: userId }).then(() => router.refresh()),
      {
        loading: translations.toast.assignLoading,
        success: translations.toast.assignSuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.assignError),
      }
    )
  }

  const handleResolve = () => {
    if (!user) return
    toast.promise(
      resolveMutation.mutateAsync({ resolvedBy: user.id }).then(() => router.refresh()),
      {
        loading: translations.toast.resolveLoading,
        success: translations.toast.resolveSuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.resolveError),
      }
    )
  }

  const handleClose = (solution: string) => {
    if (!user) return
    toast.promise(
      closeMutation.mutateAsync({ closedBy: user.id, solution }).then(() => router.refresh()),
      {
        loading: translations.toast.closeLoading,
        success: translations.toast.closeSuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.closeError),
      }
    )
  }

  const handleStatusChange = (status: TTicketStatus) => {
    toast.promise(
      updateStatusMutation.mutateAsync({ status }).then(() => router.refresh()),
      {
        loading: translations.toast.statusLoading,
        success: translations.toast.statusSuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.statusError),
      }
    )
  }

  const handleCancel = () => {
    toast.promise(
      updateStatusMutation.mutateAsync({ status: 'cancelled' }).then(() => router.refresh()),
      {
        loading: translations.toast.cancelLoading,
        success: translations.toast.cancelSuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.cancelError),
      }
    )
  }

  const handlePriorityChange = (priority: TTicketPriority) => {
    toast.promise(
      updateTicketMutation.mutateAsync({ priority }).then(() => router.refresh()),
      {
        loading: translations.toast.priorityLoading,
        success: translations.toast.prioritySuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.priorityError),
      }
    )
  }

  const handleSaveSolution = (solution: string) => {
    toast.promise(
      updateTicketMutation.mutateAsync({ solution }).then(() => router.refresh()),
      {
        loading: translations.toast.closeLoading,
        success: translations.toast.closeSuccess,
        error: (err: Error) => getErrorMessage(err, translations.toast.closeError),
      }
    )
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
          isLoading={updateTicketMutation.isPending}
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
          createdByUser={ticket.createdByUser ?? null}
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
            searchPlaceholder: translations.assignSearchPlaceholder,
            tableColumns: translations.assignTableColumns,
            select: translations.assignSelect,
            selected: translations.assignSelected,
            selectedUser: translations.assignSelectedUser,
            cancel: translations.assignCancel,
            confirm: translations.assignConfirm,
          }}
          onAssign={handleAssign}
        />

        <TicketResolutionSection
          resolvedByUser={ticket.resolvedByUser ?? null}
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
          showResolveButton={false}
        />

        <TicketActionsSection
          closedAt={ticket.closedAt}
          closedByUser={ticket.closedByUser ?? null}
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
          showCloseButton={false}
        />

        {/* Action buttons grouped at the bottom */}
        {canManageTicket && ticket.status !== 'closed' && ticket.status !== 'cancelled' && (
          <>
            <Divider />
            <div className="flex flex-col gap-2">
              {/* Top row: Resolve and Cancel */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {!ticket.resolvedAt && (
                  <div className="flex-1">
                    <TicketResolveAction
                      className="w-full"
                      isLoading={resolveMutation.isPending}
                      label={translations.resolveTicket}
                      onResolve={handleResolve}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <CancelTicketAction
                    className="w-full"
                    isLoading={updateStatusMutation.isPending}
                    label={translations.cancelTicket}
                    onCancel={handleCancel}
                  />
                </div>
              </div>
              {/* Bottom row: Close */}
              {!ticket.closedAt && (
                <CloseTicketModal
                  className="w-full"
                  isLoading={closeMutation.isPending}
                  translations={translations.closeTicketModal}
                  onConfirm={handleClose}
                />
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
