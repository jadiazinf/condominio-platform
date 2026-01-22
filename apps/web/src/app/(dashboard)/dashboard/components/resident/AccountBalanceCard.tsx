import { Card, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react'

interface AccountBalanceCardProps {
  totalPending: number
  currency: string
  dueThisMonth: number
  trend?: {
    value: number
    isPositive: boolean
  }
  translations: {
    totalPending: string
    dueThisMonth: string
    upToDate: string
    payNow: string
  }
}

export function AccountBalanceCard({
  totalPending,
  currency,
  dueThisMonth,
  trend,
  translations: t,
}: AccountBalanceCardProps) {
  const isAllPaid = totalPending === 0

  return (
    <Card className="h-full bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700">
      <CardBody className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-white/80">{t.totalPending}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {currency} {totalPending.toLocaleString()}
              </span>
              {trend && (
                <Chip
                  classNames={{
                    base: trend.isPositive ? 'bg-red-500/20' : 'bg-green-500/20',
                    content: 'text-white text-xs font-medium',
                  }}
                  size="sm"
                  startContent={
                    trend.isPositive ? (
                      <TrendingUp className="text-white" size={12} />
                    ) : (
                      <TrendingDown className="text-white" size={12} />
                    )
                  }
                >
                  {trend.value}%
                </Chip>
              )}
            </div>
          </div>
          <div className="p-3 bg-white/20 rounded-full">
            <Wallet className="text-white" size={24} />
          </div>
        </div>

        <div className="pt-4 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">{t.dueThisMonth}</p>
              <p className="text-lg font-semibold text-white">
                {currency} {dueThisMonth.toLocaleString()}
              </p>
            </div>
            {isAllPaid ? (
              <Chip
                classNames={{
                  base: 'bg-white/20',
                  content: 'text-white font-medium',
                }}
                size="sm"
              >
                {t.upToDate}
              </Chip>
            ) : (
              <Button
                className="bg-white text-emerald-600 font-medium"
                size="sm"
                startContent={<CreditCard size={16} />}
              >
                {t.payNow}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
