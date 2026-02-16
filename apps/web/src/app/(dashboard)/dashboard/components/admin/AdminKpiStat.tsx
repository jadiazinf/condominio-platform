/**
 * KPI Stat Card reutilizable para el dashboard de administrador.
 *
 * Usado para:
 * - Condominios Activos: valor = count de condominiums activos, trend = comparacion vs mes anterior
 * - Mora (Deuda Vencida): valor = suma de cuotas overdue, trend = variacion vs mes anterior
 *   (si la mora sube = changeType "negative", si baja = "positive")
 *
 * Incluye icono con fondo coloreado, valor grande, chip de tendencia y boton "Ver todos".
 */
'use client'

import Link from 'next/link'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { cn } from '@heroui/theme'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

type TChangeType = 'positive' | 'negative' | 'neutral'

interface AdminKpiStatProps {
  title: string
  value: string
  change: string
  changeType: TChangeType
  icon: React.ReactNode
  iconBg: string
  viewAllLabel: string
  viewAllHref: string
}

export function AdminKpiStat({
  title,
  value,
  change,
  changeType,
  icon,
  iconBg,
  viewAllLabel,
  viewAllHref,
}: AdminKpiStatProps) {
  return (
    <Card className="dark:border-default-100 flex flex-col justify-between border border-transparent">
      <div className="flex p-4">
        <div
          className={cn('mt-1 flex h-8 w-8 items-center justify-center rounded-md', iconBg)}
        >
          {icon}
        </div>

        <div className="flex flex-col gap-y-2">
          <dt className="text-small text-default-500 mx-4 font-medium">{title}</dt>
          <dd className="text-default-700 px-4 text-2xl font-semibold">{value}</dd>
        </div>

        <Link
          className="absolute right-4 top-4 flex items-center gap-1 text-small text-emerald-600 dark:text-emerald-400 hover:underline"
          href={viewAllHref}
        >
          {viewAllLabel}
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-auto flex justify-end px-4 pb-4">
        <Chip
          classNames={{
            content: 'font-semibold text-[0.65rem]',
          }}
          color={
            changeType === 'positive'
              ? 'success'
              : changeType === 'neutral'
                ? 'warning'
                : 'danger'
          }
          radius="sm"
          size="sm"
          startContent={
            changeType === 'positive' ? (
              <TrendingUp size={12} />
            ) : changeType === 'negative' ? (
              <TrendingDown size={12} />
            ) : (
              <ArrowRight size={12} />
            )
          }
          variant="flat"
        >
          {change}
        </Chip>
      </div>
    </Card>
  )
}
