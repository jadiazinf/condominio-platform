import { cookies } from 'next/headers'
import { getSupportTicket } from '@packages/http-client'

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

  // Fetch ticket and translations on the server
  const [ticket, { t, locale }] = await Promise.all([
    getSupportTicket(ticketId, token),
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
      closed: t('tickets.detail.closed'),
      closedBy: t('tickets.detail.closedBy'),
      viewProfile: t('tickets.detail.viewProfile'),
      notAssigned: t('tickets.detail.notAssigned'),
      assignUser: t('tickets.detail.assignUser'),
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

  return <TicketDetailClient ticket={ticket} locale={locale} translations={translations} />
}
