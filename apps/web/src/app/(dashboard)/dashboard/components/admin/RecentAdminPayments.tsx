/**
 * Pagos Recientes (Admin)
 *
 * Muestra los ultimos 5 pagos recibidos en todos los condominios de la empresa.
 * Dato real: GET /condominium/payments (limit=5, ordenado por paymentDate desc)
 * Cada item muestra: nombre del condominio, identificador de unidad, monto, estado y fecha.
 * Status posibles: completed (verde), pending_verification (amarillo), rejected (rojo)
 * Link "Ver todos" redirige a /dashboard/payments
 */

import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Wallet, ArrowRight } from 'lucide-react'

interface IAdminPayment {
  id: string
  condominium: string
  unit: string
  amount: number
  currency: string
  status: 'completed' | 'pending_verification' | 'rejected'
  date: string
}

interface RecentAdminPaymentsProps {
  payments: IAdminPayment[]
  translations: {
    title: string
    viewAll: string
    empty: string
    status: {
      completed: string
      pending_verification: string
      rejected: string
    }
  }
}

export type { IAdminPayment }

const STATUS_COLOR_MAP: Record<IAdminPayment['status'], 'success' | 'warning' | 'danger'> = {
  completed: 'success',
  pending_verification: 'warning',
  rejected: 'danger',
}

export function RecentAdminPayments({ payments, translations: t }: RecentAdminPaymentsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between px-6 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <Wallet className="text-default-500" size={20} />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <Link
          className="flex items-center gap-1 text-small text-emerald-600 dark:text-emerald-400 hover:underline"
          href="/dashboard/condominiums"
        >
          {t.viewAll}
          <ArrowRight size={14} />
        </Link>
      </CardHeader>
      <CardBody className="px-6 py-4">
        {payments.length === 0 ? (
          <p className="text-sm text-default-400 py-4 text-center">{t.empty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map(payment => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-2 border-b border-divider last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{payment.condominium}</p>
                  <p className="text-xs text-default-400">
                    {payment.unit} &middot; {payment.date}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold">
                    {payment.currency} {payment.amount.toLocaleString()}
                  </span>
                  <Chip
                    color={STATUS_COLOR_MAP[payment.status]}
                    size="sm"
                    variant="flat"
                  >
                    {t.status[payment.status]}
                  </Chip>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
