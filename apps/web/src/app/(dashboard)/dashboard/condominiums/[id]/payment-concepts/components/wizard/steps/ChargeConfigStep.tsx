'use client'

import { Input, CurrencyInput } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { Info } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { useMemo } from 'react'
import type { IWizardFormData } from '../CreatePaymentConceptWizard'

interface ChargeConfigStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  showErrors: boolean
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
}

export function ChargeConfigStep({ formData, onUpdate, showErrors, currencies }: ChargeConfigStepProps) {
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
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      {/* Scheduling (for recurring) */}
      {formData.isRecurring && (
        <div className="flex flex-col gap-4">
          <Typography variant="body2" className="font-semibold">
            {t(`${w}.scheduling`)}
          </Typography>
          <div className="grid grid-cols-2 gap-5">
            <Select
              label={t(`${w}.issueDay`)}
              placeholder={t(`${w}.issueDayPlaceholder`)}
              tooltip={t(`${w}.tooltips.issueDay`)}
              items={dayOptions}
              value={formData.issueDay != null ? String(formData.issueDay) : ''}
              onChange={(key) => key && onUpdate({ issueDay: Number(key) })}
              isRequired
              isInvalid={showErrors && formData.isRecurring && formData.issueDay == null}
              errorMessage={showErrors && formData.isRecurring && formData.issueDay == null ? t(`${w}.errors.issueDayRequired`) : undefined}
              variant="bordered"
            />
            <Select
              label={t(`${w}.dueDay`)}
              placeholder={t(`${w}.dueDayPlaceholder`)}
              tooltip={t(`${w}.tooltips.dueDay`)}
              items={dayOptions}
              value={formData.dueDay != null ? String(formData.dueDay) : ''}
              onChange={(key) => key && onUpdate({ dueDay: Number(key) })}
              isRequired
              isInvalid={showErrors && formData.isRecurring && formData.dueDay == null}
              errorMessage={showErrors && formData.isRecurring && formData.dueDay == null ? t(`${w}.errors.dueDayRequired`) : undefined}
              variant="bordered"
            />
          </div>

          {formData.issueDay != null && formData.dueDay != null && formData.dueDay < formData.issueDay && (
            <div className="flex items-start gap-2 rounded-lg bg-primary-50 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <Typography variant="caption" className="text-primary-700">
                {t(`${w}.dueDayNextMonthHint`)}
              </Typography>
            </div>
          )}
        </div>
      )}

      {/* Partial payment */}
      <div className="flex items-center justify-between rounded-lg border border-default-200 p-4">
        <div>
          <Typography variant="body2" className="font-medium">
            {t(`${w}.allowsPartialPayment`)}
          </Typography>
          <Typography variant="caption" color="muted">
            {t(`${w}.allowsPartialPaymentHint`)}
          </Typography>
        </div>
        <Switch
          color="success"
          isSelected={formData.allowsPartialPayment}
          onValueChange={(val) => onUpdate({ allowsPartialPayment: val })}
        />
      </div>

      {/* Late payment surcharge */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <Typography variant="body2" className="font-semibold">
          {t(`${w}.latePayment`)}
        </Typography>
        <Select
          label={t(`${w}.latePaymentType`)}
          placeholder={t(`${w}.latePaymentTypePlaceholder`)}
          tooltip={t(`${w}.tooltips.latePaymentType`)}
          items={adjustmentTypeItems}
          value={formData.latePaymentType}
          onChange={(key) => key && onUpdate({ latePaymentType: key as 'none' | 'percentage' | 'fixed' })}
          variant="bordered"
        />
        {formData.latePaymentType !== 'none' && (
          <div className="grid grid-cols-2 gap-5">
            {formData.latePaymentType === 'percentage' ? (
              <CurrencyInput
                label={t(`${w}.latePaymentPercentage`)}
                placeholder={t(`${w}.latePaymentPercentagePlaceholder`)}
                tooltip={t(`${w}.tooltips.latePaymentValue`)}
                value={formData.latePaymentValue?.toFixed(2) || ''}
                onValueChange={(val) => onUpdate({ latePaymentValue: val ? Number(val) : undefined })}
                currencySymbol={<span className="text-default-400 text-sm">%</span>}
                showCurrencySymbol
                isRequired
                isInvalid={showErrors && !formData.latePaymentValue}
                errorMessage={showErrors && !formData.latePaymentValue ? t(`${w}.errors.latePaymentValueRequired`) : undefined}
              />
            ) : (
              <CurrencyInput
                label={t(`${w}.latePaymentAmount`)}
                placeholder={t(`${w}.latePaymentAmountPlaceholder`)}
                tooltip={t(`${w}.tooltips.latePaymentValue`)}
                value={formData.latePaymentValue?.toFixed(2) || ''}
                onValueChange={(val) => onUpdate({ latePaymentValue: val ? Number(val) : undefined })}
                currencySymbol={currencySymbol ? <span className="text-default-400 text-sm">{currencySymbol}</span> : undefined}
                showCurrencySymbol={!!currencySymbol}
                isRequired
                isInvalid={showErrors && !formData.latePaymentValue}
                errorMessage={showErrors && !formData.latePaymentValue ? t(`${w}.errors.latePaymentValueRequired`) : undefined}
              />
            )}
            <Input
              label={t(`${w}.graceDays`)}
              placeholder={t(`${w}.graceDaysPlaceholder`)}
              tooltip={t(`${w}.tooltips.graceDays`)}
              type="number"
              value={formData.latePaymentGraceDays?.toString() || '0'}
              onValueChange={(val) => onUpdate({ latePaymentGraceDays: val ? Number(val) : 0 })}
            />
          </div>
        )}
      </div>

      {/* Early payment discount */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <Typography variant="body2" className="font-semibold">
          {t(`${w}.earlyPayment`)}
        </Typography>
        <Select
          label={t(`${w}.earlyPaymentType`)}
          placeholder={t(`${w}.earlyPaymentTypePlaceholder`)}
          tooltip={t(`${w}.tooltips.earlyPaymentType`)}
          items={adjustmentTypeItems}
          value={formData.earlyPaymentType}
          onChange={(key) => key && onUpdate({ earlyPaymentType: key as 'none' | 'percentage' | 'fixed' })}
          variant="bordered"
        />
        {formData.earlyPaymentType !== 'none' && (
          <div className="grid grid-cols-2 gap-5">
            {formData.earlyPaymentType === 'percentage' ? (
              <CurrencyInput
                label={t(`${w}.earlyPaymentPercentage`)}
                placeholder={t(`${w}.earlyPaymentPercentagePlaceholder`)}
                tooltip={t(`${w}.tooltips.earlyPaymentValue`)}
                value={formData.earlyPaymentValue?.toFixed(2) || ''}
                onValueChange={(val) => onUpdate({ earlyPaymentValue: val ? Number(val) : undefined })}
                currencySymbol={<span className="text-default-400 text-sm">%</span>}
                showCurrencySymbol
                isRequired
                isInvalid={showErrors && !formData.earlyPaymentValue}
                errorMessage={showErrors && !formData.earlyPaymentValue ? t(`${w}.errors.earlyPaymentValueRequired`) : undefined}
              />
            ) : (
              <CurrencyInput
                label={t(`${w}.earlyPaymentAmount`)}
                placeholder={t(`${w}.earlyPaymentAmountPlaceholder`)}
                tooltip={t(`${w}.tooltips.earlyPaymentValue`)}
                value={formData.earlyPaymentValue?.toFixed(2) || ''}
                onValueChange={(val) => onUpdate({ earlyPaymentValue: val ? Number(val) : undefined })}
                currencySymbol={currencySymbol ? <span className="text-default-400 text-sm">{currencySymbol}</span> : undefined}
                showCurrencySymbol={!!currencySymbol}
                isRequired
                isInvalid={showErrors && !formData.earlyPaymentValue}
                errorMessage={showErrors && !formData.earlyPaymentValue ? t(`${w}.errors.earlyPaymentValueRequired`) : undefined}
              />
            )}
            <Input
              label={t(`${w}.daysBeforeDue`)}
              placeholder={t(`${w}.daysBeforeDuePlaceholder`)}
              tooltip={t(`${w}.tooltips.daysBeforeDue`)}
              type="number"
              value={formData.earlyPaymentDaysBeforeDue?.toString() || '0'}
              onValueChange={(val) => onUpdate({ earlyPaymentDaysBeforeDue: val ? Number(val) : 0 })}
              isRequired
              isInvalid={showErrors && !formData.earlyPaymentDaysBeforeDue}
              errorMessage={showErrors && !formData.earlyPaymentDaysBeforeDue ? t(`${w}.errors.daysBeforeDueRequired`) : undefined}
            />
          </div>
        )}
      </div>

      {/* Interest configuration */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="body2" className="font-semibold">
              {t(`${w}.interest`)}
            </Typography>
            <Typography variant="caption" color="muted">
              {t(`${w}.interestHint`)}
            </Typography>
          </div>
          <Switch
            color="success"
            isSelected={formData.interestEnabled}
            onValueChange={(val) => onUpdate({ interestEnabled: val })}
          />
        </div>
        {formData.interestEnabled && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-5">
              <Select
                label={t(`${w}.interestType`)}
                tooltip={t(`${w}.tooltips.interestType`)}
                items={interestTypeItems}
                value={formData.interestType}
                onChange={(key) => key && onUpdate({ interestType: key as 'simple' | 'compound' })}
                variant="bordered"
              />
              <CurrencyInput
                label={t(`${w}.interestRate`)}
                placeholder="0.00"
                tooltip={t(`${w}.tooltips.interestRate`)}
                value={formData.interestRate?.toFixed(2) || ''}
                onValueChange={(val) => onUpdate({ interestRate: val ? Number(val) : undefined })}
                currencySymbol={<span className="text-default-400 text-sm">%</span>}
                showCurrencySymbol
                isRequired
                isInvalid={showErrors && formData.interestEnabled && !formData.interestRate}
                errorMessage={showErrors && formData.interestEnabled && !formData.interestRate ? t(`${w}.errors.interestRateRequired`) : undefined}
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Select
                label={t(`${w}.interestCalculationPeriod`)}
                tooltip={t(`${w}.tooltips.interestCalculationPeriod`)}
                items={interestPeriodItems}
                value={formData.interestCalculationPeriod}
                onChange={(key) => key && onUpdate({ interestCalculationPeriod: key as 'monthly' | 'daily' })}
                variant="bordered"
              />
              <Input
                label={t(`${w}.interestGraceDays`)}
                placeholder="0"
                tooltip={t(`${w}.tooltips.interestGraceDays`)}
                type="number"
                value={formData.interestGracePeriodDays?.toString() || '0'}
                onValueChange={(val) => onUpdate({ interestGracePeriodDays: val ? Number(val) : 0 })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
