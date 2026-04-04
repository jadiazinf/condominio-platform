'use client'

import { BookOpen, Download, TrendingDown, TrendingUp } from 'lucide-react'
import {
  useBillingAccountStatement,
  type IBillingAccountStatement,
} from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { useTranslation } from '@/contexts'
import { useCondominium } from '@/stores'

import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'

interface Props {
  unitId: string
}

export function UnitStatementClient({ unitId }: Props) {
  const { t } = useTranslation()
  const { selectedCondominium } = useCondominium()
  const condominiumId = selectedCondominium?.condominium?.id ?? ''

  // Default date range: last 3 months
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]!
  const to = now.toISOString().split('T')[0]!

  const { data: statementData, isLoading } = useBillingAccountStatement(
    unitId, condominiumId, from, to,
    { enabled: !!unitId && !!condominiumId }
  )
  const statement = statementData?.data as IBillingAccountStatement | undefined

  const csvUrl = condominiumId
    ? `/billing/units/${unitId}/statement/csv?condominiumId=${condominiumId}&from=${from}&to=${to}`
    : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">Estado de cuenta</Typography>
          <Typography className="mt-1" color="muted">
            Movimientos de la unidad
          </Typography>
        </div>
        {statement && csvUrl && (
          <Button
            as="a"
            href={csvUrl}
            className="w-full sm:w-auto"
            color="primary"
            variant="flat"
            startContent={<Download className="h-4 w-4" />}
          >
            Exportar CSV
          </Button>
        )}
      </div>

      {!condominiumId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <BookOpen className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">Selecciona un condominio para ver el estado de cuenta</Typography>
        </div>
      )}

      {isLoading && condominiumId && (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      )}

      {statement && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <Typography variant="caption" color="muted">Total débitos</Typography>
              </div>
              <Typography className="mt-1 text-lg font-bold">{formatAmount(statement.totalDebits)}</Typography>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-500" />
                <Typography variant="caption" color="muted">Total créditos</Typography>
              </div>
              <Typography className="mt-1 text-lg font-bold text-green-600">{formatAmount(statement.totalCredits)}</Typography>
            </Card>
            <Card className="p-4">
              <Typography variant="caption" color="muted">Saldo actual</Typography>
              <Typography className={`mt-1 text-lg font-bold ${parseFloat(statement.currentBalance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatAmount(statement.currentBalance)}
              </Typography>
            </Card>
          </div>

          {/* Ledger table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-default-50">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-right">Débito</th>
                    <th className="px-4 py-3 text-right">Crédito</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.entries.map((entry, i) => (
                    <tr key={i} className="border-b border-default-100">
                      <td className="px-4 py-2 text-default-500">{entry.date}</td>
                      <td className="px-4 py-2">{entry.description ?? '-'}</td>
                      <td className="px-4 py-2 text-right text-red-600">
                        {entry.debit ? formatAmount(entry.debit) : ''}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        {entry.credit ? formatAmount(entry.credit) : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatAmount(entry.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Aging */}
          {statement.aging && (
            <Card className="p-4">
              <Typography variant="h3" className="mb-3">Antigüedad de deuda</Typography>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <Typography variant="caption" color="muted">Corriente</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.current)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">30 días</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.days30)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">60 días</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.days60)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">90+ días</Typography>
                  <Typography className="font-semibold text-red-600">{formatAmount(statement.aging.days90Plus)}</Typography>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
