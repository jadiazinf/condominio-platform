'use client'

import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  useBillingAccountStatement,
  type IBillingAccountStatement,
} from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Select, SelectItem } from '@/ui/components/select'
import { Card } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import { LedgerTable } from '@/ui/components/ledger-table'

interface TUnitOption {
  id: string
  unitNumber: string
  buildingName: string
  condominiumId: string
  condominiumName: string
}

interface Props {
  allUnits: TUnitOption[]
  selectedUnitId: string
}

export function MyStatementClient({ allUnits, selectedUnitId }: Props) {
  const router = useRouter()
  const { t } = useTranslation()

  const selectedUnit = allUnits.find(u => u.id === selectedUnitId)!
  const condominiumId = selectedUnit.condominiumId

  // Default date range: last 3 months
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]!
  const to = now.toISOString().split('T')[0]!

  const { data: statementData, isLoading } = useBillingAccountStatement(
    selectedUnitId, condominiumId, from, to,
    { enabled: !!selectedUnitId && !!condominiumId }
  )
  const statement = statementData?.data as IBillingAccountStatement | undefined

  const handleUnitChange = (keys: Set<string> | 'all') => {
    const unitId = Array.from(keys as Set<string>)[0]
    if (unitId) {
      router.push(`/dashboard/my-statement?unitId=${unitId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h2">{t('resident.myStatement.title')}</Typography>
        <Typography className="mt-1" color="muted">
          {t('resident.myStatement.subtitle')}
        </Typography>
      </div>

      {/* Unit selector */}
      {allUnits.length > 1 && (
        <Select
          label={t('resident.myStatement.selectUnit')}
          selectedKeys={[selectedUnitId]}
          onSelectionChange={handleUnitChange}
          className="max-w-xs"
        >
          {allUnits.map(u => (
            <SelectItem key={u.id}>
              {u.buildingName ? `${u.buildingName} - ${u.unitNumber}` : u.unitNumber}
            </SelectItem>
          ))}
        </Select>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      )}

      {statement && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <Typography variant="caption" color="muted">{t('resident.myStatement.totalDebits')}</Typography>
              </div>
              <Typography className="mt-1 text-lg font-bold">{formatAmount(statement.totalDebits)}</Typography>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-500" />
                <Typography variant="caption" color="muted">{t('resident.myStatement.totalCredits')}</Typography>
              </div>
              <Typography className="mt-1 text-lg font-bold text-green-600">{formatAmount(statement.totalCredits)}</Typography>
            </Card>
            <Card className="p-4">
              <Typography variant="caption" color="muted">{t('resident.myStatement.currentBalance')}</Typography>
              <Typography className={`mt-1 text-lg font-bold ${parseFloat(statement.currentBalance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatAmount(statement.currentBalance)}
              </Typography>
              {parseFloat(statement.currentBalance) < 0 && (
                <Typography variant="caption" color="muted">{t('resident.myStatement.favorBalance')}</Typography>
              )}
            </Card>
          </div>

          {/* Ledger table */}
          <LedgerTable
            entries={statement.entries}
            emptyMessage={t('resident.myStatement.emptyLedger')}
          />

          {/* Aging */}
          {statement.aging && (
            <Card className="p-4">
              <Typography variant="h3" className="mb-3">{t('resident.myStatement.aging.title')}</Typography>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <Typography variant="caption" color="muted">{t('resident.myStatement.aging.current')}</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.current)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">{t('resident.myStatement.aging.days30')}</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.days30)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">{t('resident.myStatement.aging.days60')}</Typography>
                  <Typography className="font-semibold">{formatAmount(statement.aging.days60)}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="muted">{t('resident.myStatement.aging.days90Plus')}</Typography>
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
