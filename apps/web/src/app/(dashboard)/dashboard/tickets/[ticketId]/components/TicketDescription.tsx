import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Divider } from '@/ui/components/divider'

import { Typography } from '@/ui/components/typography'

export interface ITicketDescriptionProps {
  description: string
  title: string
}

export function TicketDescription({ description, title }: ITicketDescriptionProps) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="subtitle1">{title}</Typography>
      </CardHeader>
      <Divider />
      <CardBody>
        <Typography variant="body1">{description}</Typography>
      </CardBody>
    </Card>
  )
}
