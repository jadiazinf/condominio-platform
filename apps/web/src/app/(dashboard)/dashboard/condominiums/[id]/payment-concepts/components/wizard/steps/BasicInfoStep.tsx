'use client'

import type { IWizardFormData, TChargeGenerationStrategy } from '../CreatePaymentConceptWizard'

import { Info } from 'lucide-react'
import { useMemo } from 'react'

import { DatePicker } from '@/ui/components/date-picker'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { RadioGroup, Radio } from '@/ui/components/radio'
import { useTranslation } from '@/contexts'

interface BasicInfoStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  currencies: Array<{ id: string; code: string; name?: string }>
  showErrors: boolean
}

export function BasicInfoStep({ formData, onUpdate, currencies, showErrors }: BasicInfoStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.basicInfo'

  const typeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'maintenance', label: t('admin.paymentConcepts.types.maintenance') },
      { key: 'condominium_fee', label: t('admin.paymentConcepts.types.condominiumFee') },
      { key: 'extraordinary', label: t('admin.paymentConcepts.types.extraordinary') },
      { key: 'fine', label: t('admin.paymentConcepts.types.fine') },
      { key: 'reserve_fund', label: t('admin.paymentConcepts.types.reserveFund') },
      { key: 'other', label: t('admin.paymentConcepts.types.other') },
    ],
    [t]
  )

  const recurrenceItems: ISelectItem[] = useMemo(
    () => [
      { key: 'monthly', label: t('admin.paymentConcepts.recurrence.monthly') },
      { key: 'quarterly', label: t('admin.paymentConcepts.recurrence.quarterly') },
      { key: 'yearly', label: t('admin.paymentConcepts.recurrence.yearly') },
    ],
    [t]
  )

  const currencyItems: ISelectItem[] = useMemo(
    () =>
      currencies
        .map(c => ({ key: c.id, label: c.name ? `${c.code} — ${c.name}` : c.code }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [currencies]
  )

  return (
    <div className="flex flex-col gap-5">
      <Typography color="muted" variant="body2">
        {t(`${w}.description`)}
      </Typography>

      <Input
        isRequired
        errorMessage={showErrors && !formData.name ? t('common.required') : undefined}
        isInvalid={showErrors && !formData.name}
        label={t(`${w}.name`)}
        placeholder={t(`${w}.namePlaceholder`)}
        tooltip={t(`${w}.tooltips.name`)}
        value={formData.name}
        onValueChange={val => onUpdate({ name: val })}
      />

      <Textarea
        label={t(`${w}.descriptionLabel`)}
        maxRows={3}
        placeholder={t(`${w}.descriptionPlaceholder`)}
        tooltip={t(`${w}.tooltips.description`)}
        value={formData.description}
        onValueChange={val => onUpdate({ description: val })}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          isRequired
          errorMessage={
            showErrors && !formData.conceptType ? t(`${w}.errors.typeRequired`) : undefined
          }
          isInvalid={showErrors && !formData.conceptType}
          items={typeItems}
          label={t(`${w}.type`)}
          placeholder={t(`${w}.typePlaceholder`)}
          tooltip={t(`${w}.tooltips.type`)}
          value={formData.conceptType}
          variant="bordered"
          onChange={key => key && onUpdate({ conceptType: key as IWizardFormData['conceptType'] })}
        />

        <Select
          isRequired
          errorMessage={
            showErrors && !formData.currencyId ? t(`${w}.errors.currencyRequired`) : undefined
          }
          isInvalid={showErrors && !formData.currencyId}
          items={currencyItems}
          label={t(`${w}.currency`)}
          placeholder={t(`${w}.currencyPlaceholder`)}
          tooltip={t(`${w}.tooltips.currency`)}
          value={formData.currencyId}
          variant="bordered"
          onChange={key => key && onUpdate({ currencyId: key })}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DatePicker
          isRequired
          errorMessage={showErrors && !formData.effectiveFrom ? t('common.required') : undefined}
          label={t(`${w}.effectiveFrom`)}
          value={formData.effectiveFrom}
          onChange={val => onUpdate({ effectiveFrom: val })}
        />

        <DatePicker
          label={t(`${w}.effectiveUntil`)}
          value={formData.effectiveUntil}
          onChange={val => onUpdate({ effectiveUntil: val })}
        />
      </div>

      <div className="flex items-start gap-3 justify-between rounded-lg border border-default-200 p-4">
        <div className="flex-1 min-w-0">
          <Typography className="font-medium" variant="body2">
            {t(`${w}.isRecurring`)}
          </Typography>
          <Typography color="muted" variant="caption">
            {t(`${w}.isRecurringHint`)}
          </Typography>
        </div>
        <Switch
          className="shrink-0"
          color="primary"
          isSelected={formData.isRecurring}
          onValueChange={val => onUpdate({ isRecurring: val })}
        />
      </div>

      {formData.isRecurring && (
        <Select
          isRequired
          errorMessage={
            showErrors && formData.isRecurring && !formData.recurrencePeriod
              ? t(`${w}.errors.recurrenceRequired`)
              : undefined
          }
          isInvalid={showErrors && formData.isRecurring && !formData.recurrencePeriod}
          items={recurrenceItems}
          label={t(`${w}.recurrencePeriod`)}
          placeholder={t(`${w}.recurrencePeriodPlaceholder`)}
          tooltip={t(`${w}.tooltips.recurrencePeriod`)}
          value={formData.recurrencePeriod || ''}
          variant="bordered"
          onChange={key =>
            key && onUpdate({ recurrencePeriod: key as 'monthly' | 'quarterly' | 'yearly' })
          }
        />
      )}

      {formData.isRecurring && (
        <div className="flex flex-col gap-3 rounded-lg border border-default-200 p-4">
          <Typography className="font-semibold" variant="body2">
            {t(`${w}.chargeGeneration.title`)}
          </Typography>
          <Typography color="muted" variant="caption">
            {t(`${w}.chargeGeneration.description`)}
          </Typography>
          <RadioGroup
            color="primary"
            value={formData.chargeGenerationStrategy}
            onValueChange={val =>
              onUpdate({ chargeGenerationStrategy: val as TChargeGenerationStrategy })
            }
          >
            <Radio description={t(`${w}.chargeGeneration.autoHint`)} value="auto">
              {t(`${w}.chargeGeneration.auto`)}
            </Radio>
            <Radio description={t(`${w}.chargeGeneration.bulkHint`)} value="bulk">
              {t(`${w}.chargeGeneration.bulk`)}
            </Radio>
            <Radio description={t(`${w}.chargeGeneration.manualHint`)} value="manual">
              {t(`${w}.chargeGeneration.manual`)}
            </Radio>
          </RadioGroup>

          {formData.chargeGenerationStrategy === 'bulk' && !formData.effectiveUntil && (
            <div className="flex items-start gap-2 rounded-lg bg-warning-50 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <Typography className="text-warning-700" variant="caption">
                {t(`${w}.chargeGeneration.bulkRequiresEndDate`)}
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
