'use client'

import { Card, CardBody } from '@heroui/card'
import { cn } from '@heroui/theme'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive?: boolean
  }
  description?: string
  className?: string
}

export function MetricCard({ title, value, icon, trend, description, className }: MetricCardProps) {
  function renderTrend() {
    if (!trend) return null

    const TrendIcon = trend.value === 0 ? Minus : trend.isPositive ? TrendingUp : TrendingDown
    const trendColor = trend.value === 0 ? 'text-default-500' : trend.isPositive ? 'text-success' : 'text-danger'

    return (
      <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
        <TrendIcon size={14} />
        <span>{Math.abs(trend.value)}%</span>
      </div>
    )
  }

  return (
    <Card className={cn('border border-divider', className)}>
      <CardBody className="gap-2 p-4">
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-default-100 p-2">{icon}</div>
          {renderTrend()}
        </div>

        <div className="mt-2">
          <p className="text-sm text-default-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && <p className="text-xs text-default-400 mt-1">{description}</p>}
        </div>
      </CardBody>
    </Card>
  )
}
