import type { TSupportTicket, TUser } from '@packages/domain'

import { TicketHeader, TicketDescription, TicketMessages, TicketDetails } from './components'

export interface IDescriptionTranslations {
  title: string
}

export interface IMessagesTranslations {
  title: string
  noMessages: string
  internalMessage: string
  attachments: string
  loadingMessages: string
  messagePlaceholder: string
  internalCheckbox: string
  sendButton: string
  sending: string
  success: string
  error: string
  today?: string
  ticketClosed?: string
  attachFiles?: string
  dropFilesHere?: string
  invalidFileType?: string
  fileTooLarge?: string
  uploading?: string
  removeFile?: string
  downloadFile?: string
  openImage?: string
  galleryTitle?: string
  galleryNoAttachments?: string
  galleryImages?: string
  galleryVideos?: string
  galleryDocuments?: string
  galleryUploadedBy?: string
  galleryShowAll?: string
  galleryShowLess?: string
}

export interface IDetailsTranslations {
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
  closeTicketModal: {
    trigger: string
    title: string
    solutionLabel: string
    solutionPlaceholder: string
    cancel: string
    confirm: string
    confirmClosing: string
  }
  changeStatus: string
  changePriority: string
  priorities: {
    low: string
    medium: string
    high: string
    urgent: string
  }
  statuses: {
    open: string
    in_progress: string
    waiting_customer: string
    resolved: string
    closed: string
    cancelled: string
  }
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

export interface ITicketTranslations {
  description: IDescriptionTranslations
  messages: IMessagesTranslations
  details: IDetailsTranslations
  statusLabels: Record<string, string>
  priorityLabels: Record<string, string>
  categoryLabels: Record<string, string>
}

export interface ITicketDetailClientProps {
  ticket: TSupportTicket
  locale: string
  translations: ITicketTranslations
  availableUsers: TUser[]
}

export function TicketDetailClient({ ticket, locale, translations, availableUsers }: ITicketDetailClientProps) {
  return (
    <div className="space-y-6">
      <TicketHeader
        subject={ticket.subject}
        ticketNumber={ticket.ticketNumber}
        priority={ticket.priority}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <TicketDescription description={ticket.description} title={translations.description.title} />
          <TicketMessages
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            locale={locale}
            translations={translations.messages}
          />
        </div>

        <div className="space-y-6">
          <TicketDetails
            ticket={ticket}
            locale={locale}
            translations={translations.details}
            statusLabels={translations.statusLabels}
            priorityLabels={translations.priorityLabels}
            categoryLabels={translations.categoryLabels}
            availableUsers={availableUsers}
          />
        </div>
      </div>
    </div>
  )
}
