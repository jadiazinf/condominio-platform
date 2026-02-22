'use client'

import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { useMemo } from 'react'
import type { IWizardFormData } from '../CreatePaymentConceptWizard'

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
    () => currencies
      .map(c => ({ key: c.id, label: c.name ? `${c.code} — ${c.name}` : c.code }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [currencies]
  )

  return (
    <div className="flex flex-col gap-5">
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      <Input
        label={t(`${w}.name`)}
        placeholder={t(`${w}.namePlaceholder`)}
        tooltip={t(`${w}.tooltips.name`)}
        value={formData.name}
        onValueChange={(val) => onUpdate({ name: val })}
        isRequired
        isInvalid={showErrors && !formData.name}
        errorMessage={showErrors && !formData.name ? t('common.required') : undefined}
      />

      <Textarea
        label={t(`${w}.descriptionLabel`)}
        placeholder={t(`${w}.descriptionPlaceholder`)}
        tooltip={t(`${w}.tooltips.description`)}
        value={formData.description}
        onValueChange={(val) => onUpdate({ description: val })}
        maxRows={3}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label={t(`${w}.type`)}
          placeholder={t(`${w}.typePlaceholder`)}
          tooltip={t(`${w}.tooltips.type`)}
          items={typeItems}
          value={formData.conceptType}
          onChange={(key) => key && onUpdate({ conceptType: key as IWizardFormData['conceptType'] })}
          isRequired
          isInvalid={showErrors && !formData.conceptType}
          errorMessage={showErrors && !formData.conceptType ? t(`${w}.errors.typeRequired`) : undefined}
          variant="bordered"
        />

        <Select
          label={t(`${w}.currency`)}
          placeholder={t(`${w}.currencyPlaceholder`)}
          tooltip={t(`${w}.tooltips.currency`)}
          items={currencyItems}
          value={formData.currencyId}
          onChange={(key) => key && onUpdate({ currencyId: key })}
          isRequired
          isInvalid={showErrors && !formData.currencyId}
          errorMessage={showErrors && !formData.currencyId ? t(`${w}.errors.currencyRequired`) : undefined}
          variant="bordered"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-default-200 p-4">
        <div>
          <Typography variant="body2" className="font-medium">
            {t(`${w}.isRecurring`)}
          </Typography>
          <Typography variant="caption" color="muted">
            {t(`${w}.isRecurringHint`)}
          </Typography>
        </div>
        <Switch
          color="success"
          isSelected={formData.isRecurring}
          onValueChange={(val) => onUpdate({ isRecurring: val })}
        />
      </div>

      {formData.isRecurring && (
        <Select
          label={t(`${w}.recurrencePeriod`)}
          placeholder={t(`${w}.recurrencePeriodPlaceholder`)}
          tooltip={t(`${w}.tooltips.recurrencePeriod`)}
          items={recurrenceItems}
          value={formData.recurrencePeriod || ''}
          onChange={(key) => key && onUpdate({ recurrencePeriod: key as 'monthly' | 'quarterly' | 'yearly' })}
          isRequired
          isInvalid={showErrors && formData.isRecurring && !formData.recurrencePeriod}
          errorMessage={showErrors && formData.isRecurring && !formData.recurrencePeriod ? t(`${w}.errors.recurrenceRequired`) : undefined}
          variant="bordered"
        />
      )}
    </div>
  )
}
