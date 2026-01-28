import { AlertCircle, ArrowLeft } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'

export interface ITicketHeaderProps {
  subject: string
  ticketNumber: string
  priority: string
}

export function TicketHeader({ subject, ticketNumber, priority }: ITicketHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button className="mt-1" href="/dashboard/tickets" isIconOnly variant="flat">
        <ArrowLeft size={18} />
      </Button>
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
    </div>
  )
}
