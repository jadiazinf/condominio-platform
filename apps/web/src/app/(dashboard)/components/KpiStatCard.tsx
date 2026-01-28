'use client'

import type { ICardProps } from '@/ui/components/card'
import type { ReactNode } from 'react'

import { Card } from '@/ui/components/card'
import { cn } from '@heroui/theme'
import { tv, type VariantProps } from 'tailwind-variants'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'

const kpiCard = tv({
  slots: {
    card: 'shadow-none border-none min-h-[140px]',
    iconWrapper: 'rounded-lg p-2',
    trendWrapper: 'flex items-center gap-x-1 text-xs font-medium',
    valueText: 'text-3xl font-bold',
    titleText: 'text-sm font-medium opacity-90',
  },
  variants: {
    color: {
      // Emerald/Teal - Fresh green
      emerald: {
        card: 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700',
        iconWrapper: 'bg-white/20',
        trendWrapper: 'text-emerald-100',
        valueText: 'text-white',
        titleText: 'text-emerald-50',
      },
      // Cyan/Sky - Cool blue
      cyan: {
        card: 'bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700',
        iconWrapper: 'bg-white/20',
        trendWrapper: 'text-cyan-100',
        valueText: 'text-white',
        titleText: 'text-cyan-50',
      },
      // Violet/Indigo - Rich purple
      violet: {
        card: 'bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700',
        iconWrapper: 'bg-white/20',
        trendWrapper: 'text-violet-100',
        valueText: 'text-white',
        titleText: 'text-violet-50',
      },
      // Rose/Pink - Warm pink
      rose: {
        card: 'bg-gradient-to-br from-rose-500 to-pink-600 dark:from-rose-600 dark:to-pink-700',
        iconWrapper: 'bg-white/20',
        trendWrapper: 'text-rose-100',
        valueText: 'text-white',
        titleText: 'text-rose-50',
      },
      // Amber/Orange - Warm orange
      amber: {
        card: 'bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700',
        iconWrapper: 'bg-white/20',
        trendWrapper: 'text-amber-100',
        valueText: 'text-white',
        titleText: 'text-amber-50',
      },
      // Slate/Gray - Neutral
      slate: {
        card: 'bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800',
        iconWrapper: 'bg-white/20',
        trendWrapper: 'text-slate-200',
        valueText: 'text-white',
        titleText: 'text-slate-100',
      },
      // Original HeroUI colors kept for compatibility
      primary: {
        card: 'bg-primary',
        iconWrapper: 'bg-primary-600/30',
        trendWrapper: 'text-primary-100',
        valueText: 'text-primary-foreground',
        titleText: 'text-primary-100',
      },
      success: {
        card: 'bg-success',
        iconWrapper: 'bg-success-600/30',
        trendWrapper: 'text-success-100',
        valueText: 'text-success-foreground',
        titleText: 'text-success-100',
      },
      warning: {
        card: 'bg-warning',
        iconWrapper: 'bg-warning-600/30',
        trendWrapper: 'text-warning-100',
        valueText: 'text-warning-foreground',
        titleText: 'text-warning-100',
      },
      danger: {
        card: 'bg-danger',
        iconWrapper: 'bg-danger-600/30',
        trendWrapper: 'text-danger-100',
        valueText: 'text-danger-foreground',
        titleText: 'text-danger-100',
      },
      secondary: {
        card: 'bg-secondary',
        iconWrapper: 'bg-secondary-600/30',
        trendWrapper: 'text-secondary-100',
        valueText: 'text-secondary-foreground',
        titleText: 'text-secondary-100',
      },
      default: {
        card: 'bg-default-100',
        iconWrapper: 'bg-default-200',
        trendWrapper: 'text-default-600',
        valueText: 'text-default-900',
        titleText: 'text-default-600',
      },
    },
  },
  defaultVariants: {
    color: 'default',
  },
})

type TChartData = {
  name: string
  value: number
}

type TKpiStatCardProps = {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
    isPositive?: boolean
  }
  chartData?: TChartData[]
  chartIndex?: number
} & Omit<ICardProps, 'children'> &
  VariantProps<typeof kpiCard>

export function KpiStatCard({
  title,
  value,
  icon,
  trend,
  chartData,
  chartIndex = 0,
  color = 'default',
  className,
  ...props
}: TKpiStatCardProps) {
  const classes = kpiCard({ color })

  const chartColor = {
    // Custom gradient colors
    emerald: 'rgba(255, 255, 255, 0.8)',
    cyan: 'rgba(255, 255, 255, 0.8)',
    violet: 'rgba(255, 255, 255, 0.8)',
    rose: 'rgba(255, 255, 255, 0.8)',
    amber: 'rgba(255, 255, 255, 0.8)',
    slate: 'rgba(255, 255, 255, 0.8)',
    // Original HeroUI colors
    primary: 'hsl(var(--heroui-primary-200))',
    success: 'hsl(var(--heroui-success-200))',
    warning: 'hsl(var(--heroui-warning-200))',
    danger: 'hsl(var(--heroui-danger-200))',
    secondary: 'hsl(var(--heroui-secondary-200))',
    default: 'hsl(var(--heroui-default-500))',
  }[color ?? 'default']

  return (
    <Card className={classes.card({ className })} {...props}>
      <section className="flex h-full flex-nowrap justify-between">
        <div className="flex flex-col justify-between gap-y-2 p-4">
          <div className="flex flex-col gap-y-3">
            <div className="flex items-center gap-x-3">
              {icon && <div className={classes.iconWrapper()}>{icon}</div>}
              <span className={classes.titleText()}>{title}</span>
            </div>
            <span className={classes.valueText()}>{value}</span>
          </div>
          {trend && (
            <div className={classes.trendWrapper()}>
              <span>
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && <span className="opacity-70">{trend.label}</span>}
            </div>
          )}
        </div>
        {chartData && chartData.length > 0 && (
          <div className="mt-8 min-h-20 w-28 min-w-[100px] shrink-0">
            <ResponsiveContainer className="[&_.recharts-surface]:outline-hidden" width="100%">
              <AreaChart accessibilityLayer data={chartData}>
                <defs>
                  <linearGradient id={`colorGradient${chartIndex}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[Math.min(...chartData.map(d => d.value)) * 0.9, 'auto']} hide />
                <Area
                  dataKey="value"
                  fill={`url(#colorGradient${chartIndex})`}
                  stroke={chartColor}
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </Card>
  )
}
