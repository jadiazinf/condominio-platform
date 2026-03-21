'use client'

import type { IPaymentWizardState, IUnitOption } from '../PaymentWizardClient'

import { useEffect, useCallback, useMemo } from 'react'
import { usePayableQuotas, type IPayableQuotaGroup } from '@packages/http-client'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { Checkbox } from '@/ui/components/checkbox'
import { Chip } from '@/ui/components/chip'
import { CurrencyInput } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Divider } from '@/ui/components/divider'

interface SelectQuotasStepProps {
  state: IPaymentWizardState
  unitOptions: IUnitOption[]
  preselectedQuotaIds: string[]
  onUpdate: (updates: Partial<IPaymentWizardState>) => void
}

export function SelectQuotasStep({
  state,
  unitOptions,
  preselectedQuotaIds,
  onUpdate,
}: SelectQuotasStepProps) {
  const { t } = useTranslation()
  const p = 'resident.pay.selectQuotas'

  // Fetch all payable quotas for the unit (empty conceptIds = backend fetches all)
  const { data: quotasData, isLoading } = usePayableQuotas(
    state.unitId,
    [], // Empty array triggers backend to auto-fetch all concepts for the unit
    !!state.unitId
  )

  const groups: IPayableQuotaGroup[] = useMemo(
    () => (quotasData as { data?: { groups?: IPayableQuotaGroup[] } })?.data?.groups ?? [],
    [quotasData]
  )

  // Store groups in state for other steps to reference
  useEffect(() => {
    if (groups.length > 0) {
      onUpdate({ quotaGroups: groups })
    }
  }, [groups])

  // Pre-select quotas from URL params on first load
  useEffect(() => {
    if (
      preselectedQuotaIds.length > 0 &&
      groups.length > 0 &&
      state.selectedQuotaIds.length === 0
    ) {
      const validIds = preselectedQuotaIds.filter(id =>
        groups.some(g => g.quotas.some(q => q.id === id))
      )

      if (validIds.length > 0) {
        // Initialize amounts with full balances
        const amounts: Record<string, string> = {}

        for (const id of validIds) {
          const quota = groups.flatMap(g => g.quotas).find(q => q.id === id)

          if (quota) amounts[id] = quota.balance
        }
        onUpdate({ selectedQuotaIds: validIds, amounts })
      }
    }
  }, [preselectedQuotaIds, groups])

  // Unit selector items
  const unitSelectItems: ISelectItem[] = useMemo(
    () =>
      unitOptions.map(u => ({
        key: u.unitId,
        label: `${u.unitNumber} - ${u.buildingName} (${u.condominiumName})`,
      })),
    [unitOptions]
  )

  // Handle unit change
  const handleUnitChange = useCallback(
    (key: string | null) => {
      onUpdate({
        unitId: key ?? '',
        selectedQuotaIds: [],
        amounts: {},
        validationResult: null,
      })
    },
    [onUpdate]
  )

  // Toggle quota selection (simple toggle, oldest-first validated on "Continuar")
  const handleToggleQuota = useCallback(
    (quotaId: string, group: IPayableQuotaGroup) => {
      const isSelected = state.selectedQuotaIds.includes(quotaId)

      if (isSelected) {
        const newSelected = state.selectedQuotaIds.filter(id => id !== quotaId)
        const newAmounts = { ...state.amounts }

        delete newAmounts[quotaId]
        onUpdate({ selectedQuotaIds: newSelected, amounts: newAmounts })
      } else {
        const quota = group.quotas.find(q => q.id === quotaId)
        const newAmounts = { ...state.amounts, [quotaId]: quota?.balance ?? '0' }

        onUpdate({
          selectedQuotaIds: [...state.selectedQuotaIds, quotaId],
          amounts: newAmounts,
        })
      }
    },
    [state.selectedQuotaIds, state.amounts, onUpdate]
  )

  // Handle amount change for a quota
  const handleAmountChange = useCallback(
    (quotaId: string, value: string) => {
      onUpdate({
        amounts: { ...state.amounts, [quotaId]: value },
      })
    },
    [state.amounts, onUpdate]
  )

  // Calculate total — use quota.balance as fallback (same as CurrencyInput display)
  const total = useMemo(() => {
    return state.selectedQuotaIds.reduce((sum, id) => {
      const quota = groups.flatMap(g => g.quotas).find(q => q.id === id)
      const amount = parseFloat(state.amounts[id] ?? quota?.balance ?? '0')

      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
  }, [state.selectedQuotaIds, state.amounts, groups])

  // Determine currency symbol from first group
  const currencySymbol = useMemo(() => {
    if (groups.length === 0) return ''

    return groups[0]?.concept.currencySymbol ?? '$'
  }, [groups])

  // Format amount with locale
  const formatAmount = useCallback((value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value

    if (isNaN(num)) return '0,00'

    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }, [])

  if (!state.unitId && unitOptions.length > 1) {
    return (
      <div className="space-y-4">
        <Typography variant="h4">{t(`${p}.title`)}</Typography>
        <Select
          isRequired
          items={unitSelectItems}
          label={t(`${p}.selectUnit`)}
          value={state.unitId}
          onChange={handleUnitChange}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Typography variant="h4">{t(`${p}.title`)}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t(`${p}.subtitle`)}
        </Typography>
      </div>

      {/* Unit selector (if multiple units) */}
      {unitOptions.length > 1 && (
        <Select
          items={unitSelectItems}
          label={t(`${p}.selectUnit`)}
          value={state.unitId}
          onChange={handleUnitChange}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* No quotas */}
      {!isLoading && groups.length === 0 && state.unitId && (
        <div className="py-12 text-center">
          <Typography color="muted">{t(`${p}.noQuotas`)}</Typography>
        </div>
      )}

      {/* Quota groups */}
      {!isLoading &&
        groups.map(group => (
          <Card key={group.concept.id} className="overflow-hidden">
            <CardHeader className="flex items-center justify-between gap-2 bg-default-50 px-4 py-3 dark:bg-default-100/50">
              <div className="flex items-center gap-2">
                <Typography className="font-semibold" variant="body1">
                  {group.concept.name}
                </Typography>
                <Chip
                  color={group.concept.allowsPartialPayment ? 'success' : 'warning'}
                  size="sm"
                  variant="flat"
                >
                  {group.concept.allowsPartialPayment
                    ? t(`${p}.partialAllowed`)
                    : t(`${p}.fullPaymentOnly`)}
                </Chip>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {group.quotas.map((quota, idx) => {
                const isSelected = state.selectedQuotaIds.includes(quota.id)
                const isOverdue = quota.status === 'overdue'
                const amount = state.amounts[quota.id] ?? quota.balance

                return (
                  <div key={quota.id}>
                    {idx > 0 && <Divider />}
                    <div
                      className={`flex items-start gap-3 p-4 transition-colors ${
                        isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <Checkbox
                        className="mt-0.5"
                        isSelected={isSelected}
                        onChange={() => handleToggleQuota(quota.id, group)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Typography variant="body2">
                              {quota.periodDescription ??
                                `${quota.periodMonth}/${quota.periodYear}`}
                            </Typography>
                            {isOverdue && (
                              <Chip color="danger" size="sm" variant="flat">
                                {t(`${p}.overdue`)}
                              </Chip>
                            )}
                          </div>
                          <Typography className="text-sm text-default-500">
                            {t(`${p}.dueDate`)}:{' '}
                            {new Date(quota.dueDate + 'T00:00:00').toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Typography>
                        </div>

                        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                          <Typography className="text-sm text-default-500">
                            {t(`${p}.pending`)}: {group.concept.currencySymbol ?? '$'}{' '}
                            {formatAmount(quota.balance)}
                          </Typography>

                          {isSelected && (
                            <div className="w-40">
                              {group.concept.allowsPartialPayment ? (
                                <CurrencyInput
                                  currencySymbol={
                                    <span className="text-default-400 text-sm">
                                      {group.concept.currencySymbol ?? '$'}
                                    </span>
                                  }
                                  label={t(`${p}.amount`)}
                                  size="sm"
                                  value={amount}
                                  onValueChange={v => handleAmountChange(quota.id, v)}
                                />
                              ) : (
                                <div className="text-right">
                                  <Typography className="text-sm text-default-500">
                                    {t(`${p}.amount`)}
                                  </Typography>
                                  <Typography className="font-semibold">
                                    {formatAmount(quota.balance)}
                                  </Typography>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardBody>
          </Card>
        ))}

      {/* Sticky total footer */}
      {state.selectedQuotaIds.length > 0 && (
        <div className="sticky bottom-0 rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
          <div className="flex items-center justify-between">
            <Typography variant="body2">
              {state.selectedQuotaIds.length}{' '}
              {state.selectedQuotaIds.length === 1
                ? t(`${p}.quotaSelected`)
                : t(`${p}.quotasSelected`)}
            </Typography>
            <div className="text-right">
              <Typography className="text-sm text-default-500">{t(`${p}.total`)}</Typography>
              <Typography className="text-lg font-bold">
                {currencySymbol ? `${currencySymbol} ` : ''}
                {formatAmount(total)}
              </Typography>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
