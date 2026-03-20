import { Calendar, AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'

type TQuotaStatus = 'pending' | 'partial' | 'overdue' | 'paid' | 'exonerated'

export interface IQuota {
  id: string
  concept: string
  periodDescription: string
  amount: number
  balance: number
  currency: string
  currencyCode: string
  dueDate: string
  status: TQuotaStatus
}

interface UpcomingQuotasProps {
  quotas: IQuota[]
  maxItems?: number
  translations: {
    title: string
    noQuotas: string
    dueDate: string
    viewAll: string
    balance: string
    status: {
      pending: string
      partial: string
      overdue: string
      paid: string
      exonerated: string
    }
  }
}

const statusConfig: Record<
  TQuotaStatus,
  { color: 'warning' | 'danger' | 'success' | 'secondary' | 'primary'; icon: typeof Clock }
> = {
  pending: { color: 'warning', icon: Clock },
  partial: { color: 'primary', icon: Clock },
  overdue: { color: 'danger', icon: AlertCircle },
  paid: { color: 'success', icon: CheckCircle2 },
  exonerated: { color: 'secondary', icon: CheckCircle2 },
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function UpcomingQuotas({ quotas, maxItems = 3, translations: t }: UpcomingQuotasProps) {
  const displayedQuotas = quotas.slice(0, maxItems)
  const hasMore = quotas.length > maxItems

  return (
    <Card>
      <CardHeader className="flex justify-between items-center px-6 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <Calendar className="text-default-500" size={20} />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        {hasMore && (
          <Button
            as={Link}
            color="primary"
            endContent={<ChevronRight size={14} />}
            href="/dashboard/my-quotas"
            size="sm"
            variant="light"
          >
            {t.viewAll}
          </Button>
        )}
      </CardHeader>
      <CardBody className="px-6 py-4">
        {quotas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="text-success mb-2" size={40} />
            <p className="text-default-500">{t.noQuotas}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedQuotas.map(quota => {
              const config = statusConfig[quota.status]
              const StatusIcon = config.icon

              return (
                <div
                  key={quota.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-default-100 hover:bg-default-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-${config.color}/10`}>
                      <StatusIcon className={`text-${config.color}`} size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{quota.concept}</p>
                      {quota.periodDescription && (
                        <p className="text-xs text-default-400">{quota.periodDescription}</p>
                      )}
                      <p className="text-xs text-default-500">
                        {t.dueDate}: {quota.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {quota.currency} {formatAmount(quota.amount)}
                      </p>
                      {quota.balance !== quota.amount && (
                        <p className="text-xs text-default-500">
                          {t.balance}: {quota.currency} {formatAmount(quota.balance)}
                        </p>
                      )}
                      <Chip color={config.color} size="sm" variant="flat">
                        {t.status[quota.status]}
                      </Chip>
                    </div>
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
