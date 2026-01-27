import { AlertCircle } from 'lucide-react'

import { Typography } from '@/ui/components/typography'

export interface ITicketHeaderProps {
  subject: string
  ticketNumber: string
  priority: string
}

export function TicketHeader({ subject, ticketNumber, priority }: ITicketHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <AlertCircle
        className={
          priority === 'urgent' || priority === 'high' ? 'text-danger' : 'text-default-400'
        }
        size={32}
      />
      <div>
        <Typography variant="h3">{subject}</Typography>
        <Typography color="muted" variant="body2">
          Ticket #{ticketNumber}
        </Typography>
      </div>
    </div>
  )
}
