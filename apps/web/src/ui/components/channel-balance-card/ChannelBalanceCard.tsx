'use client'

import { formatAmount } from '@packages/utils/currency'
import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { AlertTriangle } from 'lucide-react'

export interface ChannelBalanceCardProps {
  channelName: string
  balance: string
  currencySymbol?: string
  isOverdue?: boolean
  onClick?: () => void
}

export function ChannelBalanceCard({
  channelName,
  balance,
  currencySymbol,
  isOverdue = false,
  onClick,
}: ChannelBalanceCardProps) {
  const numBalance = parseFloat(balance)
  const isDebt = numBalance > 0
  const balanceColor = isDebt ? 'text-red-600' : numBalance < 0 ? 'text-green-600' : ''

  return (
    <Card
      className={`p-4 transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${isOverdue ? 'border-danger-200' : ''}`}
      isPressable={!!onClick}
      onPress={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <Typography variant="caption" color="muted" className="truncate">
            {channelName}
          </Typography>
          <Typography className={`mt-1 text-lg font-bold ${balanceColor}`}>
            {currencySymbol ? `${currencySymbol} ` : ''}{formatAmount(balance)}
          </Typography>
        </div>
        {isOverdue && (
          <div className="ml-2 flex-shrink-0" title="Pago vencido">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
        )}
      </div>
      {isDebt && (
        <Typography variant="caption" color="muted" className="mt-1">
          Saldo deudor
        </Typography>
      )}
      {numBalance < 0 && (
        <Typography variant="caption" color="muted" className="mt-1">
          Saldo a favor
        </Typography>
      )}
    </Card>
  )
}
