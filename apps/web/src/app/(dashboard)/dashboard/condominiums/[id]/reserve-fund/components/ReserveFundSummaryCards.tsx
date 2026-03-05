'use client'

import { Card, CardBody } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { DollarSign, TrendingUp, Clock, FileText, Receipt } from 'lucide-react'
import { useReserveFundSummary } from '@packages/http-client/hooks'
import type { TSummaryTranslations } from './types'

interface ReserveFundSummaryCardsProps {
  condominiumId: string
  managementCompanyId: string
  translations: TSummaryTranslations
}

function formatCurrency(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return '0,00'
  return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ReserveFundSummaryCards({
  condominiumId,
  managementCompanyId,
  translations: t,
}: ReserveFundSummaryCardsProps) {
  const { data, isLoading } = useReserveFundSummary({
    companyId: managementCompanyId,
    condominiumId,
    enabled: !!managementCompanyId && !!condominiumId,
  })

  const summary = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  const secondaryCards = [
    {
      label: t.totalCharged,
      value: formatCurrency(summary?.totalCharged ?? '0'),
      icon: TrendingUp,
      color: 'text-primary' as const,
      bgColor: 'bg-primary/10' as const,
    },
    {
      label: t.totalPending,
      value: formatCurrency(summary?.totalPending ?? '0'),
      icon: Clock,
      color: 'text-warning' as const,
      bgColor: 'bg-warning/10' as const,
    },
    {
      label: t.totalExpenses,
      value: formatCurrency(summary?.totalExpenses ?? '0'),
      icon: Receipt,
      color: 'text-danger' as const,
      bgColor: 'bg-danger/10' as const,
    },
    {
      label: t.conceptCount,
      value: String(summary?.conceptCount ?? 0),
      icon: FileText,
      color: 'text-secondary' as const,
      bgColor: 'bg-secondary/10' as const,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Primary card - Total Acumulado */}
      <Card>
        <CardBody className="flex flex-row items-center gap-5 p-6">
          <div className="rounded-xl bg-success/10 p-4">
            <DollarSign className="h-8 w-8 text-success" />
          </div>
          <div>
            <Typography variant="body2" color="muted">
              {t.totalPaid}
            </Typography>
            <Typography variant="h2" className="mt-1">
              {formatCurrency(summary?.totalPaid ?? '0')}
            </Typography>
          </div>
        </CardBody>
      </Card>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryCards.map(card => (
          <Card key={card.label}>
            <CardBody className="flex flex-row items-center gap-4 p-4">
              <div className={`rounded-lg p-3 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <Typography variant="caption" color="muted">
                  {card.label}
                </Typography>
                <Typography variant="h4" className="mt-0.5">
                  {card.value}
                </Typography>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
