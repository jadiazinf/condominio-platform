'use client'

import type { TSupportTicket } from '@packages/domain'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Divider } from '@/ui/components/divider'
import { Button } from '@/ui/components/button'
import { Calendar, UserPlus } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { getStatusColor, getPriorityColor, formatDate } from './ticket-helpers'
import { UserInfo } from './UserInfo'

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
  closed: string
  closedBy: string
  viewProfile: string
  notAssigned: string
  assignUser: string
}

export interface ITicketDetailsProps {
  ticket: TSupportTicket
  locale: string
  translations: ITicketDetailsTranslations
  statusLabels: Record<string, string>
  priorityLabels: Record<string, string>
  categoryLabels: Record<string, string>
}

export function TicketDetails({
  ticket,
  locale,
  translations,
  statusLabels,
  priorityLabels,
  categoryLabels,
}: ITicketDetailsProps) {
  const statusLabel = statusLabels[ticket.status.toLowerCase()] || ticket.status
  const priorityLabel = priorityLabels[ticket.priority.toLowerCase()] || ticket.priority
  const categoryLabel = ticket.category
    ? categoryLabels[ticket.category.toLowerCase()] || ticket.category
    : categoryLabels.general

  return (
    <Card>
      <CardHeader>
        <Typography variant="subtitle1">{translations.title}</Typography>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        <div>
          <Typography color="muted" variant="caption">
            {translations.state}
          </Typography>
          <div className="mt-1">
            <Chip color={getStatusColor(ticket.status)} variant="flat">
              {statusLabel}
            </Chip>
          </div>
        </div>

        <div>
          <Typography color="muted" variant="caption">
            {translations.priority}
          </Typography>
          <div className="mt-1">
            <Chip color={getPriorityColor(ticket.priority)} variant="flat">
              {priorityLabel}
            </Chip>
          </div>
        </div>

        {ticket.category && (
          <div>
            <Typography color="muted" variant="caption">
              {translations.category}
            </Typography>
            <div className="mt-1 flex items-center gap-2">
              <Typography variant="body2">{categoryLabel}</Typography>
            </div>
          </div>
        )}

        <Divider />

        <div>
          <Typography color="muted" variant="caption">
            {translations.created}
          </Typography>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="text-default-400" size={16} />
            <Typography variant="body2">{formatDate(ticket.createdAt, locale)}</Typography>
          </div>
        </div>

        {ticket.createdByUser && (
          <div>
            <Typography color="muted" variant="caption">
              {translations.createdBy}
            </Typography>
            <div className="mt-1">
              <UserInfo
                user={ticket.createdByUser}
                showViewProfile
                viewProfileLabel={translations.viewProfile}
              />
            </div>
          </div>
        )}

        <div>
          <Typography color="muted" variant="caption">
            {translations.assignedTo}
          </Typography>
          {ticket.assignedToUser ? (
            <div className="mt-1">
              <UserInfo
                user={ticket.assignedToUser}
                showViewProfile
                viewProfileLabel={translations.viewProfile}
              />
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <Typography color="muted" variant="body2">
                {translations.notAssigned}
              </Typography>
              <Button color="primary" startContent={<UserPlus size={16} />} variant="flat">
                {translations.assignUser}
              </Button>
            </div>
          )}
        </div>

        {ticket.resolvedAt && (
          <div>
            <Typography color="muted" variant="caption">
              {translations.resolved}
            </Typography>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="text-default-400" size={16} />
              <Typography variant="body2">{formatDate(ticket.resolvedAt, locale)}</Typography>
            </div>
          </div>
        )}

        {ticket.resolvedByUser && (
          <div>
            <Typography color="muted" variant="caption">
              {translations.resolvedBy}
            </Typography>
            <div className="mt-1">
              <UserInfo
                user={ticket.resolvedByUser}
                showViewProfile
                viewProfileLabel={translations.viewProfile}
              />
            </div>
          </div>
        )}

        {ticket.closedAt && (
          <div>
            <Typography color="muted" variant="caption">
              {translations.closed}
            </Typography>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="text-default-400" size={16} />
              <Typography variant="body2">{formatDate(ticket.closedAt, locale)}</Typography>
            </div>
          </div>
        )}

        {ticket.closedByUser && (
          <div>
            <Typography color="muted" variant="caption">
              {translations.closedBy}
            </Typography>
            <div className="mt-1">
              <UserInfo
                user={ticket.closedByUser}
                showViewProfile
                viewProfileLabel={translations.viewProfile}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
