'use client'

import React, { useMemo } from 'react'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Tabs, Tab } from '@/ui/components/tabs'
import { Spinner } from '@/ui/components/spinner'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { usePaymentsByDateRange } from '@packages/http-client'
import type { TPayment } from '@packages/domain'

type TChartData = {
  month: string
  value: number
}

type TPeriodKey = '6-months' | '3-months' | '30-days' | '7-days'

interface IncomeChartProps {
  managementCompanyId: string
  currencySymbol: string
  translations: {
    title: string
    periods: {
      sixMonths: string
      threeMonths: string
      thirtyDays: string
      sevenDays: string
    }
    collected: string
  }
}

function getDateRange(period: TPeriodKey): { startDate: string; endDate: string } {
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  let start: Date

  switch (period) {
    case '6-months':
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      break
    case '3-months':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      break
    case '30-days':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '7-days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
  }

  return { startDate: start.toISOString().split('T')[0], endDate: end }
}

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function groupPaymentsByPeriod(payments: TPayment[], period: TPeriodKey): TChartData[] {
  const completed = payments.filter((p) => p.status === 'completed')

  if (period === '7-days') {
    // Group by day of the week
    const now = new Date()
    const days: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = `${d.getDate()}/${d.getMonth() + 1}`
      const label = DAY_NAMES_SHORT[d.getDay()]
      days[`${label} ${key}`] = 0
    }

    for (const p of completed) {
      const d = new Date(p.paymentDate)
      const key = `${d.getDate()}/${d.getMonth() + 1}`
      const label = DAY_NAMES_SHORT[d.getDay()]
      const dayKey = `${label} ${key}`
      if (dayKey in days) {
        days[dayKey] += parseFloat(p.amount) || 0
      }
    }

    return Object.entries(days).map(([month, value]) => ({ month, value: Math.round(value * 100) / 100 }))
  }

  if (period === '30-days') {
    // Group by week
    const now = new Date()
    const weeks: { label: string; start: Date; end: Date; value: number }[] = []
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
      weeks.push({
        label: `Sem ${4 - i}`,
        start: weekStart,
        end: weekEnd,
        value: 0,
      })
    }

    for (const p of completed) {
      const d = new Date(p.paymentDate)
      for (const week of weeks) {
        if (d >= week.start && d <= week.end) {
          week.value += parseFloat(p.amount) || 0
          break
        }
      }
    }

    return weeks.map((w) => ({ month: w.label, value: Math.round(w.value * 100) / 100 }))
  }

  // Group by month (3-months or 6-months)
  const monthsCount = period === '6-months' ? 6 : 3
  const now = new Date()
  const months: { key: string; label: string; value: number }[] = []

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_NAMES_SHORT[d.getMonth()],
      value: 0,
    })
  }

  for (const p of completed) {
    const d = new Date(p.paymentDate)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const month = months.find((m) => m.key === key)
    if (month) {
      month.value += parseFloat(p.amount) || 0
    }
  }

  return months.map((m) => ({ month: m.label, value: Math.round(m.value * 100) / 100 }))
}

export function IncomeChart({ currencySymbol, translations: t }: IncomeChartProps) {
  const [activePeriod, setActivePeriod] = React.useState<TPeriodKey>('6-months')

  const { startDate, endDate } = useMemo(() => getDateRange(activePeriod), [activePeriod])

  const { data: paymentsData, isLoading } = usePaymentsByDateRange(startDate, endDate)
  const payments: TPayment[] = paymentsData?.data ?? []

  const chartData = useMemo(() => groupPaymentsByPeriod(payments, activePeriod), [payments, activePeriod])

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData])

  const color = total > 0 ? 'success' : 'default'

  return (
    <Card className="dark:border-default-100 border border-transparent">
      <section className="flex flex-col flex-nowrap">
        <div className="flex flex-col justify-between gap-y-2 p-6">
          <div className="flex flex-col gap-y-2">
            <dt className="text-medium text-foreground font-medium">{t.title}</dt>

            <div className="mt-2">
              <Tabs
                size="sm"
                selectedKey={activePeriod}
                onSelectionChange={key => setActivePeriod(key as TPeriodKey)}
              >
                <Tab key="6-months" title={t.periods.sixMonths} />
                <Tab key="3-months" title={t.periods.threeMonths} />
                <Tab key="30-days" title={t.periods.thirtyDays} />
                <Tab key="7-days" title={t.periods.sevenDays} />
              </Tabs>
            </div>

            <div className="mt-2 flex items-center gap-x-3">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-foreground text-3xl font-bold">
                  {currencySymbol} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <span className="text-tiny text-default-400">{t.collected}</span>
          </div>
        </div>

        <ResponsiveContainer
          className="min-h-[280px] [&_.recharts-surface]:outline-hidden"
          height="100%"
          width="100%"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            height={280}
            margin={{ left: 0, right: 0 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="10%"
                  stopColor={`hsl(var(--heroui-${color}-500))`}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={`hsl(var(--heroui-${color}-100))`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="hsl(var(--heroui-default-200))"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="month"
              style={{ fontSize: 'var(--heroui-font-size-tiny)' }}
              tickLine={false}
            />
            <Tooltip
              content={({ label, payload }) => (
                <div className="rounded-medium bg-foreground text-tiny shadow-small flex h-auto min-w-[120px] items-center gap-x-2 p-2">
                  <div className="flex w-full flex-col gap-y-0">
                    {payload?.map((p, index) => (
                      <div key={`${index}-${p.name}`} className="flex w-full items-center gap-x-2">
                        <span className="text-small text-background flex w-full items-center gap-x-1">
                          {currencySymbol} {(p.value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    <span className="text-small text-foreground-400 font-medium">{label}</span>
                  </div>
                </div>
              )}
              cursor={{ strokeWidth: 0 }}
            />
            <Area
              activeDot={{
                stroke: `hsl(var(--heroui-${color}))`,
                strokeWidth: 2,
                fill: 'hsl(var(--heroui-background))',
                r: 5,
              }}
              animationDuration={1000}
              animationEasing="ease"
              dataKey="value"
              fill="url(#incomeGradient)"
              stroke={`hsl(var(--heroui-${color}))`}
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>
    </Card>
  )
}
