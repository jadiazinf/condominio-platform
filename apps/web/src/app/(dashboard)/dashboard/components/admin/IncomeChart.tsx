'use client'

import React from 'react'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Tabs, Tab } from '@/ui/components/tabs'
import { cn } from '@heroui/theme'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

/**
 * Grafico de Ingresos por Periodo
 *
 * Muestra la evolución de los ingresos (pagos completados) a lo largo del tiempo.
 * Permite filtrar por periodo: 6 meses, 3 meses, 30 dias, 7 dias.
 *
 * Datos reales:
 * - Obtener pagos completados agrupados por mes/semana/dia segun el periodo seleccionado
 * - Endpoint: GET /condominium/payments?status=completed con date-range
 * - Agrupar por periodo y sumar montos
 * - El cambio porcentual se calcula comparando el periodo actual vs el anterior
 */

type TChartData = {
  month: string
  value: number
}

type TPeriodKey = '6-months' | '3-months' | '30-days' | '7-days'

interface IncomeChartProps {
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

// Mock data - ingresos mensuales de los ultimos 12 meses
const CHART_DATA: Record<TPeriodKey, TChartData[]> = {
  '6-months': [
    { month: 'Sep', value: 42000 },
    { month: 'Oct', value: 48500 },
    { month: 'Nov', value: 45200 },
    { month: 'Dic', value: 51000 },
    { month: 'Ene', value: 47800 },
    { month: 'Feb', value: 52300 },
  ],
  '3-months': [
    { month: 'Dic', value: 51000 },
    { month: 'Ene', value: 47800 },
    { month: 'Feb', value: 52300 },
  ],
  '30-days': [
    { month: 'Sem 1', value: 12500 },
    { month: 'Sem 2', value: 14200 },
    { month: 'Sem 3', value: 11800 },
    { month: 'Sem 4', value: 13800 },
  ],
  '7-days': [
    { month: 'Lun', value: 2100 },
    { month: 'Mar', value: 3400 },
    { month: 'Mie', value: 1800 },
    { month: 'Jue', value: 2900 },
    { month: 'Vie', value: 4200 },
    { month: 'Sab', value: 1200 },
    { month: 'Dom', value: 800 },
  ],
}

const PERIOD_TOTALS: Record<TPeriodKey, { value: number; change: string; changeType: 'positive' | 'negative' | 'neutral' }> = {
  '6-months': { value: 286800, change: '12.4%', changeType: 'positive' },
  '3-months': { value: 151100, change: '8.2%', changeType: 'positive' },
  '30-days': { value: 52300, change: '-2.1%', changeType: 'negative' },
  '7-days': { value: 16400, change: '5.7%', changeType: 'positive' },
}

export function IncomeChart({ translations: t }: IncomeChartProps) {
  const [activePeriod, setActivePeriod] = React.useState<TPeriodKey>('6-months')

  const chartData = CHART_DATA[activePeriod]
  const totals = PERIOD_TOTALS[activePeriod]

  const color =
    totals.changeType === 'positive'
      ? 'success'
      : totals.changeType === 'negative'
        ? 'danger'
        : 'default'

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
              <span className="text-foreground text-3xl font-bold">
                $ {totals.value.toLocaleString()}
              </span>
              <Chip
                classNames={{
                  content: 'font-medium',
                }}
                color={
                  totals.changeType === 'positive'
                    ? 'success'
                    : totals.changeType === 'negative'
                      ? 'danger'
                      : 'default'
                }
                radius="sm"
                size="sm"
                startContent={
                  totals.changeType === 'positive' ? (
                    <TrendingUp size={14} />
                  ) : totals.changeType === 'negative' ? (
                    <TrendingDown size={14} />
                  ) : (
                    <ArrowRight size={14} />
                  )
                }
                variant="flat"
              >
                {totals.change}
              </Chip>
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
                          $ {(p.value as number).toLocaleString()}
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
