'use client'

import type { CardProps } from '@heroui/card'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { cn } from '@heroui/theme'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

type TChartDataPoint = {
  name: string
  value: number
  [key: string]: string | number
}

type TTimePeriod = '1D' | '5D' | '1M' | '6M' | '1Y' | '5Y' | 'Max'

interface AnalyticsChartProps extends Omit<CardProps, 'children'> {
  title: string
  data: TChartDataPoint[]
  selectedPeriod?: TTimePeriod
  onPeriodChange?: (period: TTimePeriod) => void
  highlightValue?: {
    value: string | number
    position?: { x: number; y: number }
  }
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
}

const periods: TTimePeriod[] = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'Max']

export function AnalyticsChart({
  title,
  data,
  selectedPeriod = '1M',
  onPeriodChange,
  color = 'success',
  className,
  ...props
}: AnalyticsChartProps) {
  const chartColor = {
    primary: 'hsl(var(--heroui-primary))',
    success: 'hsl(var(--heroui-success))',
    warning: 'hsl(var(--heroui-warning))',
    danger: 'hsl(var(--heroui-danger))',
    secondary: 'hsl(var(--heroui-secondary))',
  }[color]

  const gradientColor = {
    primary: 'heroui-primary',
    success: 'heroui-success',
    warning: 'heroui-warning',
    danger: 'heroui-danger',
    secondary: 'heroui-secondary',
  }[color]

  return (
    <Card className={cn('border border-divider', className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-0">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          {periods.map(period => (
            <Button
              key={period}
              className={cn(
                'min-w-8 h-7 px-2 text-xs',
                selectedPeriod === period
                  ? 'bg-default-200 text-default-900'
                  : 'bg-transparent text-default-500'
              )}
              size="sm"
              variant="flat"
              onPress={() => onPeriodChange?.(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardBody className="px-2 pb-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer className="[&_.recharts-surface]:outline-hidden" width="100%">
            <AreaChart
              data={data}
              margin={{
                top: 20,
                right: 20,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id={`analyticsGradient-${color}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={`hsl(var(--${gradientColor}))`} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={`hsl(var(--${gradientColor}))`} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal
                vertical={false}
                stroke="hsl(var(--heroui-default-200))"
                strokeDasharray="3 3"
              />
              <XAxis
                axisLine={false}
                dataKey="name"
                style={{ fontSize: 'var(--heroui-font-size-tiny)' }}
                tick={{ fill: 'hsl(var(--heroui-default-500))' }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                style={{ fontSize: 'var(--heroui-font-size-tiny)' }}
                tick={{ fill: 'hsl(var(--heroui-default-500))' }}
                tickFormatter={value => `$${value.toLocaleString()}`}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg bg-content1 border border-divider px-3 py-2 shadow-lg">
                        <p className="text-sm font-semibold text-foreground">
                          ${Number(payload[0].value).toLocaleString()}
                        </p>
                      </div>
                    )
                  }

                  return null
                }}
                cursor={{ stroke: 'hsl(var(--heroui-default-300))' }}
              />
              <Area
                dataKey="value"
                fill={`url(#analyticsGradient-${color})`}
                stroke={chartColor}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
