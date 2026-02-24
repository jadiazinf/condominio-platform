'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Accordion, AccordionItem } from '@/ui/components/accordion'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { AlertTriangle, Building2, ChevronDown } from 'lucide-react'
import type {
  TConceptDelinquencyQuota,
  TConceptDelinquencyUnit,
} from '@packages/http-client/hooks'
import { usePaymentConceptDelinquency } from '@packages/http-client/hooks/use-payment-concept-delinquency'

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

interface DelinquencyModalProps {
  isOpen: boolean
  onClose: () => void
  conceptId: string
  managementCompanyId: string
  currencySymbol: string
  currencyCode: string
}

export function DelinquencyModal({
  isOpen,
  onClose,
  conceptId,
  managementCompanyId,
  currencySymbol,
  currencyCode,
}: DelinquencyModalProps) {
  const { t } = useTranslation()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'

  const { data, isLoading } = usePaymentConceptDelinquency({
    companyId: managementCompanyId,
    conceptId,
    enabled: isOpen,
  })

  const delinquency = data?.data

  const formatAmount = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currencyCode}`.trim()

  const groupedByBuilding = delinquency
    ? (() => {
        const map = new Map<string, TConceptDelinquencyUnit[]>()
        for (const unit of delinquency.units) {
          const list = map.get(unit.buildingId) ?? []
          list.push(unit)
          map.set(unit.buildingId, list)
        }
        return Array.from(map.entries()).map(([buildingId, units]) => ({
          buildingId,
          buildingName: units[0]?.buildingName ?? '',
          units,
        }))
      })()
    : []

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-warning" />
          <Typography variant="h4">{t(`${d}.delinquency`)}</Typography>
          {delinquency && delinquency.totalDelinquentUnits > 0 && (
            <Chip size="sm" variant="flat" color="warning">
              {delinquency.totalDelinquentUnits}
            </Chip>
          )}
        </ModalHeader>

        <ModalBody className="pb-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !delinquency || delinquency.units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertTriangle size={32} className="text-default-300" />
              <Typography color="muted" variant="body1">
                {t(`${d}.noDelinquency`)}
              </Typography>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-3 rounded-lg bg-warning-50 border border-warning-200 p-3">
                <div className="flex flex-col">
                  <span className="text-xs text-warning-600 font-medium">
                    {t(`${d}.delinquentUnits`)}
                  </span>
                  <span className="text-lg font-bold text-warning-700">
                    {delinquency.totalDelinquentUnits}
                  </span>
                </div>
                <div className="w-px bg-warning-200 self-stretch" />
                <div className="flex flex-col">
                  <span className="text-xs text-warning-600 font-medium">
                    {t(`${d}.totalDebt`)}
                  </span>
                  <span className="text-lg font-bold text-warning-700">
                    {formatAmount(delinquency.totalBalance)}
                  </span>
                </div>
                {delinquency.totalInterestAmount > 0 && (
                  <>
                    <div className="w-px bg-warning-200 self-stretch" />
                    <div className="flex flex-col">
                      <span className="text-xs text-warning-600 font-medium">
                        {t(`${d}.totalInterest`)}
                      </span>
                      <span className="text-lg font-bold text-warning-700">
                        {formatAmount(delinquency.totalInterestAmount)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Grouped by building */}
              <Accordion selectionMode="multiple" variant="splitted">
                {groupedByBuilding.map(group => (
                  <AccordionItem
                    key={group.buildingId}
                    title={
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-warning" />
                        <span className="text-sm font-medium">{group.buildingName}</span>
                        <Chip size="sm" variant="flat" color="warning">
                          {group.units.length} {t(`${d}.delinquentUnits`)}
                        </Chip>
                      </div>
                    }
                  >
                    <div className="space-y-2">
                      {group.units.map(unit => (
                        <DelinquencyUnitRow
                          key={unit.unitId}
                          unit={unit}
                          formatAmount={formatAmount}
                          t={t}
                          d={d}
                        />
                      ))}
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface DelinquencyUnitRowProps {
  unit: TConceptDelinquencyUnit
  formatAmount: (amount: number) => string
  t: (key: string) => string
  d: string
}

function DelinquencyUnitRow({ unit, formatAmount, t, d }: DelinquencyUnitRowProps) {
  const [showQuotas, setShowQuotas] = useState(false)

  return (
    <div className="rounded-lg border border-default-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t(`${d}.unitLabel`)} {unit.unitNumber}
          </p>
          <p className="text-xs text-default-400">
            {unit.overdueCount} {t(`${d}.overdueQuotas`)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-warning-600">
            {formatAmount(unit.totalBalance)}
          </p>
          {unit.oldestDueDate && (
            <p className="text-xs text-default-400">
              {t(`${d}.overdueFrom`)} {formatDate(unit.oldestDueDate)}
            </p>
          )}
        </div>
      </div>

      {unit.quotas.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowQuotas(!showQuotas)}
            className="mt-2 text-xs text-warning-600 flex items-center gap-1 hover:underline"
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${showQuotas ? 'rotate-180' : ''}`}
            />
            {t(`${d}.quotaDetail`)}
          </button>

          {showQuotas && (
            <div className="mt-2 space-y-1 pl-4 border-l-2 border-warning-200">
              {unit.quotas.map(quota => (
                <DelinquencyQuotaRow
                  key={quota.id}
                  quota={quota}
                  formatAmount={formatAmount}
                  t={t}
                  d={d}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface DelinquencyQuotaRowProps {
  quota: TConceptDelinquencyQuota
  formatAmount: (amount: number) => string
  t: (key: string) => string
  d: string
}

function DelinquencyQuotaRow({ quota, formatAmount, t, d }: DelinquencyQuotaRowProps) {
  const periodLabel =
    quota.periodDescription ??
    (quota.periodMonth !== null && quota.periodMonth !== undefined
      ? `${MONTH_NAMES_ES[(quota.periodMonth ?? 1) - 1]} ${quota.periodYear}`
      : `${quota.periodYear}`)

  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <div className="min-w-0">
        <span className="text-default-600">{periodLabel}</span>
        <span className="ml-2 text-default-400">
          {quota.daysOverdue} {t(`${d}.daysOverdue`)}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {Number(quota.interestAmount) > 0 && (
          <span className="text-warning-500">
            +{formatAmount(Number(quota.interestAmount))} {t(`${d}.totalInterest`).toLowerCase()}
          </span>
        )}
        <span className="font-medium">{formatAmount(Number(quota.balance))}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}
