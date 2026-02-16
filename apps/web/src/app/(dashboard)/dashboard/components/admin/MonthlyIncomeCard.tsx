'use client'

import Link from 'next/link'
import { Card } from '@/ui/components/card'
import { Progress } from '@/ui/components/progress'
import { cn } from '@heroui/theme'
import { ArrowRight } from 'lucide-react'

interface MonthlyIncomeCardProps {
  title: string
  collected: number
  expected: number
  currency: string
  label: string
  icon: React.ReactNode
  color: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'default'
  viewAllLabel: string
  viewAllHref: string
}

/**
 * Pagos del Mes vs Ingreso Esperado
 *
 * Muestra cuánto se ha cobrado en el mes actual comparado con el total esperado.
 * - `collected`: suma de pagos completados en el mes en curso
 * - `expected`: suma de todas las cuotas generadas para el mes en curso
 * - El progress bar refleja el porcentaje (collected / expected)
 *
 * Datos reales: usar pagos con status=completed del mes actual vs cuotas del mes actual
 * Endpoints: GET /condominium/payments (filtrar por date-range del mes) +
 *            GET /condominium/quotas/period?year=YYYY&month=MM
 */
export function MonthlyIncomeCard({
  title,
  collected,
  expected,
  currency,
  label,
  icon,
  color,
  viewAllLabel,
  viewAllHref,
}: MonthlyIncomeCardProps) {
  const percentage = expected > 0 ? (collected / expected) * 100 : 0

  return (
    <Card className="dark:border-default-100 relative flex flex-col border border-transparent p-4">
      <Link
        className="absolute right-4 top-4 flex items-center gap-1 text-small text-emerald-600 dark:text-emerald-400 hover:underline"
        href={viewAllHref}
      >
        {viewAllLabel}
        <ArrowRight size={12} />
      </Link>

      <div
        className={cn('flex h-10 w-10 items-center justify-center rounded-full border', {
          'border-success-200 bg-success-50 text-success': color === 'success',
          'border-warning-200 bg-warning-50 text-warning': color === 'warning',
          'border-primary-200 bg-primary-50 text-primary': color === 'primary',
          'border-secondary-200 bg-secondary-50 text-secondary': color === 'secondary',
          'border-danger-200 bg-danger-50 text-danger': color === 'danger',
          'border-default-200 bg-default-50 text-default-500': color === 'default',
        })}
      >
        {icon}
      </div>

      <div className="mt-2 flex flex-col gap-y-0.5 px-0.5">
        <dt className="text-medium text-default-700 font-medium">{title}</dt>
        <dd className="text-default-500 text-xs font-medium">
          {currency} {collected.toLocaleString()} {label} {currency} {expected.toLocaleString()}
        </dd>
      </div>

      <Progress
        aria-label="monthly-income"
        className="mt-2"
        classNames={{
          track: cn('bg-default-200', {
            'bg-success-100': color === 'success',
            'bg-warning-100': color === 'warning',
            'bg-primary-100': color === 'primary',
            'bg-secondary-100': color === 'secondary',
            'bg-danger-100': color === 'danger',
            'bg-default-100': color === 'default',
          }),
        }}
        color={color}
        value={percentage}
      />

    </Card>
  )
}
