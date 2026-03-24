import { Receipt, CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatAmount } from '@packages/utils/currency'

import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'

type TPaymentStatus = 'completed' | 'pending_verification' | 'rejected'

export interface IPayment {
  id: string
  amount: number
  currency: string
  date: string
  method: string
  status: TPaymentStatus
}

interface RecentPaymentsProps {
  payments: IPayment[]
  maxItems?: number
  translations: {
    title: string
    noPayments: string
    viewAll: string
    status: {
      completed: string
      pending_verification: string
      rejected: string
    }
  }
}

const statusConfig: Record<
  TPaymentStatus,
  { color: 'success' | 'warning' | 'danger'; icon: typeof CheckCircle2 }
> = {
  completed: { color: 'success', icon: CheckCircle2 },
  pending_verification: { color: 'warning', icon: Clock },
  rejected: { color: 'danger', icon: XCircle },
}

export function RecentPayments({ payments, maxItems = 3, translations: t }: RecentPaymentsProps) {
  const displayedPayments = payments.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-2 px-6 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <Receipt className="text-default-500" size={20} />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <Button
          as={Link}
          className="self-end sm:self-auto"
          color="primary"
          endContent={<ChevronRight size={14} />}
          href="/dashboard/my-payments"
          size="sm"
          variant="light"
        >
          {t.viewAll}
        </Button>
      </CardHeader>
      <CardBody className="px-6 py-4">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="text-default-300 mb-2" size={40} />
            <p className="text-default-500">{t.noPayments}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedPayments.map(payment => {
              const config = statusConfig[payment.status]
              const StatusIcon = config.icon

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-default-100 hover:bg-default-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-${config.color}/10`}>
                      <StatusIcon className={`text-${config.color}`} size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{payment.method}</p>
                      <p className="text-xs text-default-500">{payment.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {payment.currency} {formatAmount(payment.amount)}
                    </p>
                    <Chip color={config.color} variant="flat">
                      {t.status[payment.status]}
                    </Chip>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
