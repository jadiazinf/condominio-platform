'use client'

import { useState, useMemo } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Accordion, AccordionItem } from '@/ui/components/accordion'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { Building2, ChevronDown, Users } from 'lucide-react'
import { type TAffectedUnit, usePaymentConceptAffectedUnits } from '@packages/http-client/hooks'

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface AffectedUnitsModalProps {
  isOpen: boolean
  onClose: () => void
  conceptId: string
  managementCompanyId: string
  currencySymbol: string
  currencyCode: string
  isRecurring: boolean
}

export function AffectedUnitsModal({
  isOpen,
  onClose,
  conceptId,
  managementCompanyId,
  currencySymbol,
  currencyCode,
  isRecurring,
}: AffectedUnitsModalProps) {
  const { t } = useTranslation()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'

  const { data, isLoading } = usePaymentConceptAffectedUnits({
    companyId: managementCompanyId,
    conceptId,
    enabled: isOpen,
  })

  const affectedUnits = data?.data

  const groupedByBuilding = useMemo(() => {
    if (!affectedUnits?.units) return []
    const map = new Map<string, TAffectedUnit[]>()
    for (const unit of affectedUnits.units) {
      const list = map.get(unit.buildingId) ?? []
      list.push(unit)
      map.set(unit.buildingId, list)
    }
    return Array.from(map.entries()).map(([buildingId, units]) => ({
      buildingId,
      buildingName: units[0]?.buildingName ?? '',
      units,
    }))
  }, [affectedUnits])

  const formatAmount = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currencyCode}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <Users size={18} className="text-success" />
          <Typography variant="h4">{t(`${d}.affectedUnits`)}</Typography>
          {affectedUnits && (
            <Chip size="sm" variant="flat">{affectedUnits.totalUnits}</Chip>
          )}
        </ModalHeader>

        <ModalBody className="pb-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !affectedUnits || affectedUnits.units.length === 0 ? (
            <p className="text-sm text-default-400 py-8 text-center">{t(`${d}.noAffectedUnits`)}</p>
          ) : (
            <Accordion selectionMode="multiple" variant="splitted">
              {groupedByBuilding.map(group => (
                <AccordionItem
                  key={group.buildingId}
                  title={
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-success" />
                      <span className="text-sm font-medium">{group.buildingName}</span>
                      <Chip size="sm" variant="flat">
                        {group.units.length} {t(`${d}.units`)}
                      </Chip>
                    </div>
                  }
                >
                  <div className="space-y-2">
                    {group.units.map(unit => (
                      <UnitChargeRow
                        key={unit.unitId}
                        unit={unit}
                        formatAmount={formatAmount}
                        isRecurring={isRecurring}
                        t={t}
                        d={d}
                      />
                    ))}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface UnitChargeRowProps {
  unit: TAffectedUnit
  formatAmount: (amount: number) => string
  isRecurring: boolean
  t: (key: string) => string
  d: string
}

function UnitChargeRow({ unit, formatAmount, isRecurring, t, d }: UnitChargeRowProps) {
  const [showPeriods, setShowPeriods] = useState(false)

  return (
    <div className="rounded-lg border border-default-200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {t(`${d}.unitLabel`)} {unit.unitNumber}
          </p>
          {unit.aliquotPercentage != null && (
            <p className="text-xs text-default-400">
              {t(`${d}.aliquot`)}: {unit.aliquotPercentage}%
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{formatAmount(unit.baseAmount)}</p>
          {isRecurring && unit.periodsCount > 0 && (
            <>
              <p className="text-xs text-default-500">
                {unit.periodsCount} {unit.periodsCount === 1 ? t(`${d}.period`) : t(`${d}.periods`)}
              </p>
              <p className="text-xs font-medium text-warning-600">
                {t(`${d}.accumulated`)}: {formatAmount(unit.accumulatedAmount)}
              </p>
            </>
          )}
        </div>
      </div>

      {isRecurring && unit.periods.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowPeriods(!showPeriods)}
            className="mt-2 text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${showPeriods ? 'rotate-180' : ''}`}
            />
            {t(`${d}.periodDetail`)}
          </button>

          {showPeriods && (
            <div className="mt-2 space-y-1 pl-4 border-l-2 border-default-200">
              {unit.periods.map(p => (
                <div key={`${p.year}-${p.month}`} className="flex justify-between text-xs">
                  <span className="text-default-500">
                    {MONTH_NAMES_ES[p.month - 1]} {p.year}
                  </span>
                  <span>{formatAmount(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
