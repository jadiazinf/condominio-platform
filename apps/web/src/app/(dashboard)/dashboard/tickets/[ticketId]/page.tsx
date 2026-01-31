import { cookies } from 'next/headers'
import { getSupportTicket, fetchActiveSuperadminUsers } from '@packages/http-client'

import { getTranslations } from '@/libs/i18n/server'
import { SESSION_COOKIE_NAME } from '@/libs/cookies'
import { TicketDetailClient } from './TicketDetailClient'

interface TicketDetailPageProps {
  params: Promise<{
    ticketId: string
  }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { ticketId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || ''

  // Fetch ticket, available users, and translations on the server
  const [ticket, availableUsers, { t, locale }] = await Promise.all([
    getSupportTicket(ticketId, token),
    fetchActiveSuperadminUsers(token),
    getTranslations(),
  ])

  // Prepare translations object
  const translations = {
    description: {
      title: t('tickets.detail.description'),
    },
    messages: {
      title: t('tickets.detail.messages'),
      noMessages: t('tickets.detail.noMessages'),
      internalMessage: t('tickets.detail.internalMessage'),
      attachments: t('tickets.detail.attachments'),
      loadingMessages: t('tickets.detail.loadingMessages'),
      messagePlaceholder: t('tickets.detail.messagePlaceholder'),
      internalCheckbox: t('tickets.detail.internalCheckbox'),
      sendButton: t('tickets.detail.sendButton'),
      sending: t('tickets.detail.sending'),
      success: t('tickets.detail.success'),
      error: t('tickets.detail.error'),
      ticketClosed: t('tickets.detail.ticketClosed'),
      attachFiles: t('tickets.detail.attachFiles'),
      dropFilesHere: t('tickets.detail.dropFilesHere'),
      invalidFileType: t('tickets.detail.invalidFileType'),
      fileTooLarge: t('tickets.detail.fileTooLarge'),
      uploading: t('tickets.detail.uploading'),
      removeFile: t('tickets.detail.removeFile'),
      downloadFile: t('tickets.detail.downloadFile'),
      openImage: t('tickets.detail.openImage'),
      galleryTitle: t('tickets.detail.galleryTitle'),
      galleryNoAttachments: t('tickets.detail.galleryNoAttachments'),
      galleryImages: t('tickets.detail.galleryImages'),
      galleryVideos: t('tickets.detail.galleryVideos'),
      galleryDocuments: t('tickets.detail.galleryDocuments'),
      galleryUploadedBy: t('tickets.detail.galleryUploadedBy'),
      galleryShowAll: t('tickets.detail.galleryShowAll'),
      galleryShowLess: t('tickets.detail.galleryShowLess'),
    },
    details: {
      title: t('tickets.detail.details'),
      state: t('tickets.detail.state'),
      priority: t('tickets.detail.priority'),
      category: t('tickets.detail.category'),
      created: t('tickets.detail.created'),
      createdBy: t('tickets.detail.createdBy'),
      assignedTo: t('tickets.detail.assignedTo'),
      resolved: t('tickets.detail.resolved'),
      resolvedBy: t('tickets.detail.resolvedBy'),
      solution: t('tickets.detail.solution'),
      solutionPlaceholder: t('tickets.detail.solutionPlaceholder'),
      closed: t('tickets.detail.closed'),
      closedBy: t('tickets.detail.closedBy'),
      viewProfile: t('tickets.detail.viewProfile'),
      notAssigned: t('tickets.detail.notAssigned'),
      assignUser: t('tickets.detail.assignUser'),
      reassignUser: t('tickets.detail.reassignUser'),
      noUsersAvailable: t('tickets.detail.noUsersAvailable'),
      assignSearchPlaceholder: t('tickets.detail.assignSearchPlaceholder'),
      assignTableColumns: {
        name: t('tickets.detail.assignTableName'),
        email: t('tickets.detail.assignTableEmail'),
        document: t('tickets.detail.assignTableDocument'),
        actions: t('tickets.detail.assignTableActions'),
      },
      assignSelect: t('tickets.detail.assignSelect'),
      assignSelected: t('tickets.detail.assignSelected'),
      assignSelectedUser: t('tickets.detail.assignSelectedUser'),
      assignCancel: t('tickets.detail.assignCancel'),
      assignConfirm: t('tickets.detail.assignConfirm'),
      resolveTicket: t('tickets.detail.resolveTicket'),
      closeTicket: t('tickets.detail.closeTicket'),
      cancelTicket: t('tickets.detail.cancelTicket'),
      closeTicketModal: {
        trigger: t('tickets.detail.closeTicket'),
        title: t('tickets.detail.closeTicketModalTitle'),
        solutionLabel: t('tickets.detail.closeTicketModalSolutionLabel'),
        solutionPlaceholder: t('tickets.detail.closeTicketModalSolutionPlaceholder'),
        cancel: t('tickets.detail.closeTicketModalCancel'),
        confirm: t('tickets.detail.closeTicketModalConfirm'),
        confirmClosing: t('tickets.detail.closeTicketModalConfirmClosing'),
      },
      changeStatus: t('tickets.detail.changeStatus'),
      changePriority: t('tickets.detail.changePriority'),
      priorities: {
        low: t('tickets.priority.low'),
        medium: t('tickets.priority.medium'),
        high: t('tickets.priority.high'),
        urgent: t('tickets.priority.urgent'),
      },
      statuses: {
        open: t('tickets.status.open'),
        in_progress: t('tickets.status.in_progress'),
        waiting_customer: t('tickets.status.waiting_customer'),
        resolved: t('tickets.status.resolved'),
        closed: t('tickets.status.closed'),
        cancelled: t('tickets.status.cancelled'),
      },
      toast: {
        assignLoading: t('tickets.detail.toastAssignLoading'),
        assignSuccess: t('tickets.detail.toastAssignSuccess'),
        assignError: t('tickets.detail.toastAssignError'),
        resolveLoading: t('tickets.detail.toastResolveLoading'),
        resolveSuccess: t('tickets.detail.toastResolveSuccess'),
        resolveError: t('tickets.detail.toastResolveError'),
        closeLoading: t('tickets.detail.toastCloseLoading'),
        closeSuccess: t('tickets.detail.toastCloseSuccess'),
        closeError: t('tickets.detail.toastCloseError'),
        cancelLoading: t('tickets.detail.toastCancelLoading'),
        cancelSuccess: t('tickets.detail.toastCancelSuccess'),
        cancelError: t('tickets.detail.toastCancelError'),
        statusLoading: t('tickets.detail.toastStatusLoading'),
        statusSuccess: t('tickets.detail.toastStatusSuccess'),
        statusError: t('tickets.detail.toastStatusError'),
        priorityLoading: t('tickets.detail.toastPriorityLoading'),
        prioritySuccess: t('tickets.detail.toastPrioritySuccess'),
        priorityError: t('tickets.detail.toastPriorityError'),
      },
    },
    statusLabels: {
      open: t('tickets.status.open'),
      in_progress: t('tickets.status.in_progress'),
      waiting_customer: t('tickets.status.waiting_customer'),
      resolved: t('tickets.status.resolved'),
      closed: t('tickets.status.closed'),
      cancelled: t('tickets.status.cancelled'),
    },
    priorityLabels: {
      low: t('tickets.priority.low'),
      medium: t('tickets.priority.medium'),
      high: t('tickets.priority.high'),
      urgent: t('tickets.priority.urgent'),
    },
    categoryLabels: {
      general: t('tickets.category.general'),
      technical: t('tickets.category.technical'),
      billing: t('tickets.category.billing'),
      feature_request: t('tickets.category.feature_request'),
      other: t('tickets.category.other'),
    },
  }

  return (
    <TicketDetailClient
      ticket={ticket}
      locale={locale}
      translations={translations}
      availableUsers={availableUsers}
    />
  )
}
