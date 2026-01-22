import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { CreditCard, FileText, History, Bell, Zap } from 'lucide-react'

interface QuickActionsProps {
  translations: {
    title: string
    payQuota: string
    viewStatement: string
    paymentHistory: string
    notifications: string
  }
}

export function QuickActions({ translations: t }: QuickActionsProps) {
  const actions = [
    {
      key: 'pay',
      label: t.payQuota,
      icon: CreditCard,
      color: 'primary' as const,
      href: '/dashboard/payments/new',
    },
    {
      key: 'statement',
      label: t.viewStatement,
      icon: FileText,
      color: 'default' as const,
      href: '/dashboard/statements',
    },
    {
      key: 'history',
      label: t.paymentHistory,
      icon: History,
      color: 'default' as const,
      href: '/dashboard/payments',
    },
    {
      key: 'notifications',
      label: t.notifications,
      icon: Bell,
      color: 'default' as const,
      href: '/dashboard/notifications',
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="flex items-center gap-2 px-6 pt-5 pb-0">
        <Zap className="text-default-500" size={20} />
        <h3 className="text-lg font-semibold">{t.title}</h3>
      </CardHeader>
      <CardBody className="px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map(action => {
            const Icon = action.icon

            return (
              <Button
                key={action.key}
                className="h-auto py-4 flex-col gap-2"
                color={action.color}
                startContent={<Icon size={24} />}
                variant={action.color === 'primary' ? 'solid' : 'bordered'}
              >
                <span className="text-xs">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
