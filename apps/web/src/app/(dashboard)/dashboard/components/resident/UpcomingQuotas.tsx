import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

type TQuotaStatus = 'pending' | 'overdue' | 'paid'

export interface IQuota {
  id: string
  concept: string
  amount: number
  currency: string
  dueDate: string
  status: TQuotaStatus
}

interface UpcomingQuotasProps {
  quotas: IQuota[]
  translations: {
    title: string
    noQuotas: string
    dueDate: string
    status: {
      pending: string
      overdue: string
      paid: string
    }
  }
}

const statusConfig: Record<
  TQuotaStatus,
  { color: 'warning' | 'danger' | 'success'; icon: typeof Clock }
> = {
  pending: { color: 'warning', icon: Clock },
  overdue: { color: 'danger', icon: AlertCircle },
  paid: { color: 'success', icon: CheckCircle2 },
}

export function UpcomingQuotas({ quotas, translations: t }: UpcomingQuotasProps) {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center px-6 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <Calendar className="text-default-500" size={20} />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
      </CardHeader>
      <CardBody className="px-6 py-4">
        {quotas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="text-success mb-2" size={40} />
            <p className="text-default-500">{t.noQuotas}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotas.map(quota => {
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
                      <p className="text-xs text-default-500">
                        {t.dueDate}: {quota.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">
                        {quota.currency} {quota.amount.toLocaleString()}
                      </p>
                      <Chip color={config.color} variant="flat">
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
