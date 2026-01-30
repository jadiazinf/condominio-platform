import type { TSupportTicket } from '@packages/domain'

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
  resolveTicket: string
  closeTicket: string
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
}

export function TicketDetailClient({ ticket, locale, translations }: ITicketDetailClientProps) {
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
          />
        </div>
      </div>
    </div>
  )
}
