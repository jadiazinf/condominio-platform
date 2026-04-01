'use client'

import { useState } from 'react'
import { BookOpen, TrendingDown, TrendingUp } from 'lucide-react'
import {
  useBillingAccountStatement,
  useBillingChannels,
  type IBillingAccountStatement,
} from '@packages/http-client'
import { useCondominium } from '@/stores'
import { formatAmount } from '@packages/utils/currency'

import { Typography } from '@/ui/components/typography'
import { Select, SelectItem } from '@/ui/components/select'
import { Card } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'

export function MyStatementClient() {
  const { selectedCondominium } = useCondominium()

  const condominiumId = selectedCondominium?.condominium?.id ?? ''
  // TODO: unit selection — needs a unit picker or route param; useUnitStore was removed
  const unitId = ''

  const { data: channelsData } = useBillingChannels(condominiumId, { enabled: !!condominiumId })
  const channels = channelsData?.data ?? []

  const [selectedChannelId, setSelectedChannelId] = useState('')

  // Default date range: last 3 months
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]!
  const to = now.toISOString().split('T')[0]!

  const { data: statementData, isLoading } = useBillingAccountStatement(
    unitId, selectedChannelId, from, to,
    { enabled: !!unitId && !!selectedChannelId }
  )
  const statement = statementData?.data as IBillingAccountStatement | undefined

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h2">Mi Estado de Cuenta</Typography>
        <Typography className="mt-1" color="muted">
          Revisa tus movimientos y saldo por canal de cobro
        </Typography>
      </div>

      {/* Channel selector */}
      {channels.length > 0 && (
        <Select
          label="Canal de cobro"
          placeholder="Selecciona un canal"
          selectedKeys={selectedChannelId ? [selectedChannelId] : []}
          onSelectionChange={(keys) => setSelectedChannelId(Array.from(keys)[0] as string)}
          className="max-w-xs"
        >
          {channels.map(ch => (
            <SelectItem key={ch.id}>{ch.name}</SelectItem>
          ))}
        </Select>
      )}

      {!selectedChannelId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <BookOpen className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">Selecciona un canal para ver tu estado de cuenta</Typography>
        </div>
      )}

      {isLoading && selectedChannelId && (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      )}

      {statement && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <Typography variant="caption" color="muted">Total Cargos</Typography>
              </div>
              <Typography className="mt-1 text-lg font-bold">{formatAmount(statement.totalDebits)}</Typography>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-500" />
                <Typography variant="caption" color="muted">Total Pagos</Typography>
              </div>
              <Typography className="mt-1 text-lg font-bold text-green-600">{formatAmount(statement.totalCredits)}</Typography>
            </Card>
            <Card className="p-4">
              <Typography variant="caption" color="muted">Saldo Actual</Typography>
              <Typography className={`mt-1 text-lg font-bold ${parseFloat(statement.currentBalance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatAmount(statement.currentBalance)}
              </Typography>
              {parseFloat(statement.currentBalance) < 0 && (
                <Typography variant="caption" color="muted">Saldo a favor</Typography>
              )}
            </Card>
          </div>

          {/* Ledger table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-default-50">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Descripcion</th>
                    <th className="px-4 py-3 text-right">Cargo</th>
                    <th className="px-4 py-3 text-right">Abono</th>
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
              <Typography variant="h3" className="mb-3">Antiguedad de Saldo</Typography>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <Typography variant="caption" color="muted">0-30 dias</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.current)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">31-60 dias</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.days30)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">61-90 dias</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.days60)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">90+ dias</Typography>
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
