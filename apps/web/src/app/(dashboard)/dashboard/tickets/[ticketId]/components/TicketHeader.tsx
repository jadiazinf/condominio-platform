import { ArrowLeft } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'

export interface ITicketHeaderProps {
  subject: string
  ticketNumber: string
  priority: string
}

export function TicketHeader({ subject, ticketNumber }: ITicketHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <Button
        isIconOnly
        className="mt-0.5 shrink-0"
        href="/dashboard/tickets"
        size="sm"
        variant="flat"
      >
        <ArrowLeft size={18} />
      </Button>
      <div className="min-w-0">
        <Typography className="break-words" variant="h3">
          {subject}
        </Typography>
        <Typography color="muted" variant="body2">
          Ticket #{ticketNumber}
        </Typography>
      </div>
    </div>
  )
}
