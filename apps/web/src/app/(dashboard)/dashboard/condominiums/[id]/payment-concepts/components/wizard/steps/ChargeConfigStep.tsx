'use client'

import type { IWizardFormData } from '../CreatePaymentConceptWizard'

import { Info } from 'lucide-react'
import { useMemo } from 'react'

import { Input, CurrencyInput } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'

interface ChargeConfigStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  showErrors: boolean
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
}

export function ChargeConfigStep({
  formData,
  onUpdate,
  showErrors,
  currencies,
}: ChargeConfigStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.chargeConfig'

  const adjustmentTypeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'none', label: t(`${w}.none`) },
      { key: 'percentage', label: t(`${w}.percentage`) },
      { key: 'fixed', label: t(`${w}.fixed`) },
    ],
    [t]
  )

  const dayOptions: ISelectItem[] = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ key: String(i + 1), label: String(i + 1) })),
    []
  )

  const interestTypeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'simple', label: t(`${w}.interestSimple`) },
      { key: 'compound', label: t(`${w}.interestCompound`) },
    ],
    [t]
  )

  // Currency symbol for CurrencyInput fields
  const currencySymbol = useMemo(() => {
    if (!formData.currencyId) return ''
    const cur = currencies.find(c => c.id === formData.currencyId)

    return cur?.symbol || cur?.code || ''
  }, [formData.currencyId, currencies])

  const interestPeriodItems: ISelectItem[] = useMemo(
    () => [
      { key: 'monthly', label: t(`${w}.interestMonthly`) },
      { key: 'daily', label: t(`${w}.interestDaily`) },
    ],
    [t]
  )

  return (
    <div className="flex flex-col gap-6">
      <Typography color="muted" variant="body2">
        {t(`${w}.description`)}
      </Typography>

      {/* Scheduling */}
      <div className="flex flex-col gap-4">
        <Typography className="font-semibold" variant="body2">
          {t(`${w}.scheduling`)}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <Select
            isRequired
            errorMessage={
              showErrors && formData.issueDay == null
                ? t(`${w}.errors.issueDayRequired`)
                : undefined
            }
            isInvalid={showErrors && formData.issueDay == null}
            items={dayOptions}
            label={t(`${w}.issueDay`)}
            placeholder={t(`${w}.issueDayPlaceholder`)}
            tooltip={t(`${w}.tooltips.issueDay`)}
            value={formData.issueDay != null ? String(formData.issueDay) : ''}
            variant="bordered"
            onChange={key => key && onUpdate({ issueDay: Number(key) })}
          />
          <Select
            isRequired
            errorMessage={
              showErrors && formData.dueDay == null ? t(`${w}.errors.dueDayRequired`) : undefined
            }
            isInvalid={showErrors && formData.dueDay == null}
            items={dayOptions}
            label={t(`${w}.dueDay`)}
            placeholder={t(`${w}.dueDayPlaceholder`)}
            tooltip={t(`${w}.tooltips.dueDay`)}
            value={formData.dueDay != null ? String(formData.dueDay) : ''}
            variant="bordered"
            onChange={key => key && onUpdate({ dueDay: Number(key) })}
          />
        </div>

        {formData.issueDay != null &&
          formData.dueDay != null &&
          formData.dueDay < formData.issueDay && (
            <div className="flex items-start gap-2 rounded-lg bg-primary-50 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <Typography className="text-primary-700" variant="caption">
                {t(`${w}.dueDayNextMonthHint`)}
              </Typography>
            </div>
          )}
      </div>

      {/* Partial payment */}
      <div className="flex items-start gap-3 justify-between rounded-lg border border-default-200 p-4">
        <div className="flex-1 min-w-0">
          <Typography className="font-medium" variant="body2">
            {t(`${w}.allowsPartialPayment`)}
          </Typography>
          <Typography color="muted" variant="caption">
            {t(`${w}.allowsPartialPaymentHint`)}
          </Typography>
        </div>
        <Switch
          className="shrink-0"
          color="primary"
          isSelected={formData.allowsPartialPayment}
          onValueChange={val => onUpdate({ allowsPartialPayment: val })}
        />
      </div>

      {/* Late payment surcharge */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <Typography className="font-semibold" variant="body2">
          {t(`${w}.latePayment`)}
        </Typography>
        <Select
          items={adjustmentTypeItems}
          label={t(`${w}.latePaymentType`)}
          placeholder={t(`${w}.latePaymentTypePlaceholder`)}
          tooltip={t(`${w}.tooltips.latePaymentType`)}
          value={formData.latePaymentType}
          variant="bordered"
          onChange={key =>
            key && onUpdate({ latePaymentType: key as 'none' | 'percentage' | 'fixed' })
          }
        />
        {formData.latePaymentType !== 'none' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {formData.latePaymentType === 'percentage' ? (
              <CurrencyInput
                isRequired
                showCurrencySymbol
                currencySymbol={<span className="text-default-400 text-sm">%</span>}
                errorMessage={
                  showErrors && !formData.latePaymentValue
                    ? t(`${w}.errors.latePaymentValueRequired`)
                    : undefined
                }
                isInvalid={showErrors && !formData.latePaymentValue}
                label={t(`${w}.latePaymentPercentage`)}
                placeholder={t(`${w}.latePaymentPercentagePlaceholder`)}
                tooltip={t(`${w}.tooltips.latePaymentValue`)}
                value={formData.latePaymentValue?.toFixed(2) || ''}
                onValueChange={val => onUpdate({ latePaymentValue: val ? Number(val) : undefined })}
              />
            ) : (
              <CurrencyInput
                isRequired
                currencySymbol={
                  currencySymbol ? (
                    <span className="text-default-400 text-sm">{currencySymbol}</span>
                  ) : undefined
                }
                errorMessage={
                  showErrors && !formData.latePaymentValue
                    ? t(`${w}.errors.latePaymentValueRequired`)
                    : undefined
                }
                isInvalid={showErrors && !formData.latePaymentValue}
                label={t(`${w}.latePaymentAmount`)}
                placeholder={t(`${w}.latePaymentAmountPlaceholder`)}
                showCurrencySymbol={!!currencySymbol}
                tooltip={t(`${w}.tooltips.latePaymentValue`)}
                value={formData.latePaymentValue?.toFixed(2) || ''}
                onValueChange={val => onUpdate({ latePaymentValue: val ? Number(val) : undefined })}
              />
            )}
            <Input
              label={t(`${w}.graceDays`)}
              placeholder={t(`${w}.graceDaysPlaceholder`)}
              tooltip={t(`${w}.tooltips.graceDays`)}
              type="number"
              value={formData.latePaymentGraceDays?.toString() || '0'}
              onValueChange={val => onUpdate({ latePaymentGraceDays: val ? Number(val) : 0 })}
            />
          </div>
        )}
        {formData.latePaymentType !== 'none' && formData.dueDay != null && (
          <div className="flex items-start gap-2 rounded-lg bg-warning-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
            <Typography className="text-warning-700" variant="caption">
              {t(`${w}.surchargeStartDayHint`, {
                day: formData.dueDay + (formData.latePaymentGraceDays || 0),
              })}
            </Typography>
          </div>
        )}
      </div>

      {/* Early payment discount */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <Typography className="font-semibold" variant="body2">
          {t(`${w}.earlyPayment`)}
        </Typography>
        <Select
          items={adjustmentTypeItems}
          label={t(`${w}.earlyPaymentType`)}
          placeholder={t(`${w}.earlyPaymentTypePlaceholder`)}
          tooltip={t(`${w}.tooltips.earlyPaymentType`)}
          value={formData.earlyPaymentType}
          variant="bordered"
          onChange={key =>
            key && onUpdate({ earlyPaymentType: key as 'none' | 'percentage' | 'fixed' })
          }
        />
        {formData.earlyPaymentType !== 'none' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {formData.earlyPaymentType === 'percentage' ? (
              <CurrencyInput
                isRequired
                showCurrencySymbol
                currencySymbol={<span className="text-default-400 text-sm">%</span>}
                errorMessage={
                  showErrors && !formData.earlyPaymentValue
                    ? t(`${w}.errors.earlyPaymentValueRequired`)
                    : undefined
                }
                isInvalid={showErrors && !formData.earlyPaymentValue}
                label={t(`${w}.earlyPaymentPercentage`)}
                placeholder={t(`${w}.earlyPaymentPercentagePlaceholder`)}
                tooltip={t(`${w}.tooltips.earlyPaymentValue`)}
                value={formData.earlyPaymentValue?.toFixed(2) || ''}
                onValueChange={val =>
                  onUpdate({ earlyPaymentValue: val ? Number(val) : undefined })
                }
              />
            ) : (
              <CurrencyInput
                isRequired
                currencySymbol={
                  currencySymbol ? (
                    <span className="text-default-400 text-sm">{currencySymbol}</span>
                  ) : undefined
                }
                errorMessage={
                  showErrors && !formData.earlyPaymentValue
                    ? t(`${w}.errors.earlyPaymentValueRequired`)
                    : undefined
                }
                isInvalid={showErrors && !formData.earlyPaymentValue}
                label={t(`${w}.earlyPaymentAmount`)}
                placeholder={t(`${w}.earlyPaymentAmountPlaceholder`)}
                showCurrencySymbol={!!currencySymbol}
                tooltip={t(`${w}.tooltips.earlyPaymentValue`)}
                value={formData.earlyPaymentValue?.toFixed(2) || ''}
                onValueChange={val =>
                  onUpdate({ earlyPaymentValue: val ? Number(val) : undefined })
                }
              />
            )}
            <Input
              isRequired
              errorMessage={
                showErrors && !formData.earlyPaymentDaysBeforeDue
                  ? t(`${w}.errors.daysBeforeDueRequired`)
                  : undefined
              }
              isInvalid={showErrors && !formData.earlyPaymentDaysBeforeDue}
              label={t(`${w}.daysBeforeDue`)}
              placeholder={t(`${w}.daysBeforeDuePlaceholder`)}
              tooltip={t(`${w}.tooltips.daysBeforeDue`)}
              type="number"
              value={formData.earlyPaymentDaysBeforeDue?.toString() || '0'}
              onValueChange={val => onUpdate({ earlyPaymentDaysBeforeDue: val ? Number(val) : 0 })}
            />
          </div>
        )}
        {formData.earlyPaymentType !== 'none' && formData.dueDay != null && (
          <div className="flex items-start gap-2 rounded-lg bg-success-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
            <Typography className="text-success-700" variant="caption">
              {t(`${w}.discountCutoffDayHint`, {
                day: formData.dueDay - (formData.earlyPaymentDaysBeforeDue || 0),
              })}
            </Typography>
          </div>
        )}
      </div>

      {/* Interest configuration */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <div className="flex items-start gap-3 justify-between">
          <div className="flex-1 min-w-0">
            <Typography className="font-semibold" variant="body2">
              {t(`${w}.interest`)}
            </Typography>
            <Typography color="muted" variant="caption">
              {t(`${w}.interestHint`)}
            </Typography>
          </div>
          <Switch
            className="shrink-0"
            color="primary"
            isSelected={formData.interestEnabled}
            onValueChange={val => onUpdate({ interestEnabled: val })}
          />
        </div>
        {formData.interestEnabled && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <Select
                items={interestTypeItems}
                label={t(`${w}.interestType`)}
                tooltip={t(`${w}.tooltips.interestType`)}
                value={formData.interestType}
                variant="bordered"
                onChange={key => key && onUpdate({ interestType: key as 'simple' | 'compound' })}
              />
              <CurrencyInput
                isRequired
                showCurrencySymbol
                currencySymbol={<span className="text-default-400 text-sm">%</span>}
                errorMessage={
                  showErrors && formData.interestEnabled && !formData.interestRate
                    ? t(`${w}.errors.interestRateRequired`)
                    : undefined
                }
                isInvalid={showErrors && formData.interestEnabled && !formData.interestRate}
                label={t(`${w}.interestRate`)}
                placeholder="0.00"
                tooltip={t(`${w}.tooltips.interestRate`)}
                value={formData.interestRate?.toFixed(2) || ''}
                onValueChange={val => onUpdate({ interestRate: val ? Number(val) : undefined })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <Select
                items={interestPeriodItems}
                label={t(`${w}.interestCalculationPeriod`)}
                tooltip={t(`${w}.tooltips.interestCalculationPeriod`)}
                value={formData.interestCalculationPeriod}
                variant="bordered"
                onChange={key =>
                  key && onUpdate({ interestCalculationPeriod: key as 'monthly' | 'daily' })
                }
              />
              <Input
                label={t(`${w}.interestGraceDays`)}
                placeholder="0"
                tooltip={t(`${w}.tooltips.interestGraceDays`)}
                type="number"
                value={formData.interestGracePeriodDays?.toString() || '0'}
                onValueChange={val => onUpdate({ interestGracePeriodDays: val ? Number(val) : 0 })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
