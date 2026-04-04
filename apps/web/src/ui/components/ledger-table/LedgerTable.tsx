'use client'

import { formatAmount } from '@packages/utils/currency'
import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'

export interface ILedgerEntry {
  date: string
  description: string | null
  debit: string | null
  credit: string | null
  balance: string
  referenceType?: string
}

export interface LedgerTableProps {
  entries: ILedgerEntry[]
  emptyMessage?: string
}

export function LedgerTable({ entries, emptyMessage = 'No hay movimientos' }: LedgerTableProps) {
  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Typography color="muted">{emptyMessage}</Typography>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-default-50">
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Descripci&oacute;n</th>
              <th className="px-4 py-3 text-right">Cargo</th>
              <th className="px-4 py-3 text-right">Abono</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
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

      {/* Mobile cards */}
      <div className="space-y-0 divide-y divide-default-100 sm:hidden">
        {entries.map((entry, i) => (
          <div key={i} className="space-y-1 px-4 py-3">
            <div className="flex items-center justify-between">
              <Typography variant="caption" color="muted">{entry.date}</Typography>
              <Typography className="font-medium">{formatAmount(entry.balance)}</Typography>
            </div>
            <Typography className="text-sm">{entry.description ?? '-'}</Typography>
            <div className="flex gap-4">
              {entry.debit && (
                <Typography className="text-sm text-red-600">
                  Cargo: {formatAmount(entry.debit)}
                </Typography>
              )}
              {entry.credit && (
                <Typography className="text-sm text-green-600">
                  Abono: {formatAmount(entry.credit)}
                </Typography>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
