import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { cn } from '@/ui/utils'

import { Typography } from '@/ui/components/typography'

interface ISectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Section({ title, description, children, className }: ISectionProps) {
  return (
    <Card className={cn('border border-default-200', className)} shadow="none" radius="lg">
      <CardHeader className="flex-col items-start gap-1 px-5 pt-5 pb-4">
        <Typography variant="subtitle1" className="font-semibold">
          {title}
        </Typography>
        {description && (
          <Typography color="muted" variant="body2">
            {description}
          </Typography>
        )}
      </CardHeader>
      <CardBody className="flex flex-col gap-6 px-5 pb-5 pt-0">{children}</CardBody>
    </Card>
  )
}
