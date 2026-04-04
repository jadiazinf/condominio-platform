'use client'

import { useRouter } from 'next/navigation'
import { CreditCard, Receipt } from 'lucide-react'
import { useBillingCharges } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Select, SelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'primary'> = {
  pending: 'warning',
  partial: 'primary',
}

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

export function MyBillingChargesClient({ allUnits, selectedUnitId }: Props) {
  const router = useRouter()
  const { t } = useTranslation()

  const { data, isLoading } = useBillingCharges(
    { unitId: selectedUnitId },
    { enabled: !!selectedUnitId }
  )
  const charges = (data?.data ?? []).filter(c => c.status === 'pending' || c.status === 'partial')

  const totalPending = charges.reduce((sum, c) => sum + parseFloat(c.balance), 0)

  const handleUnitChange = (keys: Set<string> | 'all') => {
    const unitId = Array.from(keys as Set<string>)[0]
    if (unitId) {
      router.push(`/dashboard/my-billing-charges?unitId=${unitId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('resident.myBillingCharges.title')}</Typography>
          <Typography className="mt-1" color="muted">
            {t('resident.myBillingCharges.subtitle')}
          </Typography>
        </div>
        {charges.length > 0 && (
          <Button
            color="primary"
            startContent={<CreditCard className="h-4 w-4" />}
            onPress={() => router.push('/dashboard/pay')}
          >
            {t('resident.myBillingCharges.pay')}
          </Button>
        )}
      </div>

      {/* Unit selector */}
      {allUnits.length > 1 && (
        <Select
          label={t('resident.myBillingCharges.selectUnit')}
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

      {totalPending > 0 && (
        <Card className="bg-warning-50 p-4">
          <Typography variant="caption" color="muted">{t('resident.myBillingCharges.totalPending')}</Typography>
          <Typography className="text-2xl font-bold text-warning-700">
            {formatAmount(totalPending.toFixed(2))}
          </Typography>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      )}

      {!isLoading && charges.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <Receipt className="mb-3 h-12 w-12 text-green-400" />
          <Typography color="muted">{t('resident.myBillingCharges.empty')}</Typography>
          <Typography variant="caption" color="muted" className="mt-1">
            {t('resident.myBillingCharges.emptyDescription')}
          </Typography>
        </div>
      )}

      {!isLoading && charges.length > 0 && (
        <div className="space-y-2">
          {charges.map(charge => (
            <Card key={charge.id} className="flex items-center justify-between p-4">
              <div>
                <Typography className="font-medium">{charge.description ?? 'Cargo'}</Typography>
                <Typography variant="caption" color="muted">
                  {String(charge.periodMonth).padStart(2, '0')}/{charge.periodYear}
                </Typography>
              </div>
              <div className="flex items-center gap-3">
                <Chip color={STATUS_COLORS[charge.status] ?? 'default'} size="sm">
                  {t(`resident.myBillingCharges.statuses.${charge.status}`) ?? charge.status}
                </Chip>
                <Typography className="font-bold">{formatAmount(charge.balance)}</Typography>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
