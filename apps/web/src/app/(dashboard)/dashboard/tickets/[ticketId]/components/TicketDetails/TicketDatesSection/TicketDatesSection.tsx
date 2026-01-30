'use client'

import { Typography } from '@/ui/components/typography'
import { Calendar } from 'lucide-react'
import { formatDate } from '../../ticket-helpers'

interface ITicketDatesSectionProps {
  createdAt: Date
  resolvedAt: Date | null
  locale: string
  translations: {
    created: string
    resolved: string
  }
}

export function TicketDatesSection({
  createdAt,
  resolvedAt,
  locale,
  translations,
}: ITicketDatesSectionProps) {
  return (
    <>
      <div>
        <Typography color="muted" variant="caption">
          {translations.created}
        </Typography>
        <div className="mt-1 flex items-center gap-2">
          <Calendar className="text-default-400" size={16} />
          <Typography variant="body2">{formatDate(createdAt, locale)}</Typography>
        </div>
      </div>

      {resolvedAt && (
        <div>
          <Typography color="muted" variant="caption">
            {translations.resolved}
          </Typography>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="text-default-400" size={16} />
            <Typography variant="body2">{formatDate(resolvedAt, locale)}</Typography>
          </div>
        </div>
      )}
    </>
  )
}
