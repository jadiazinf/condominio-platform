'use client'

import { useFormContext } from 'react-hook-form'
import { Button } from '@/ui/components'
import { useTranslation } from '@/contexts'
import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'

interface ConfirmationStepProps {
  onGoToStep: (step: 'basic' | 'location' | 'contact') => void
}

export function ConfirmationStep({ onGoToStep }: ConfirmationStepProps) {
  const { t } = useTranslation()
  const { getValues } = useFormContext<ICondominiumFormData>()

  const values = getValues()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">
        {t('condominiums.confirmation.title')}
      </h3>

      {/* Basic Information */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">
            {t('condominiums.confirmation.sections.basic')}
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onGoToStep('basic')}
          >
            {t('condominiums.actions.edit')}
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-default-600">{t('condominiums.form.fields.name.label')}</dt>
          <dd className="text-foreground font-medium">{values.name || '-'}</dd>

          <dt className="text-default-600">{t('condominiums.form.fields.code.label')}</dt>
          <dd className="text-foreground">{values.code || t('condominiums.form.fields.code.placeholder')}</dd>

          <dt className="text-default-600">{t('condominiums.form.fields.status.label')}</dt>
          <dd className="text-foreground">
            {values.isActive
              ? t('condominiums.form.fields.status.active')
              : t('condominiums.form.fields.status.inactive')}
          </dd>
        </dl>
      </div>

      {/* Location */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">
            {t('condominiums.confirmation.sections.location')}
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onGoToStep('location')}
          >
            {t('condominiums.actions.edit')}
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-default-600">{t('condominiums.form.fields.address.label')}</dt>
          <dd className="text-foreground col-span-2">{values.address || '-'}</dd>
        </dl>
      </div>

      {/* Contact */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">
            {t('condominiums.confirmation.sections.contact')}
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onGoToStep('contact')}
          >
            {t('condominiums.actions.edit')}
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-default-600">{t('condominiums.form.fields.phoneNumber.label')}</dt>
          <dd className="text-foreground">
            {values.phone ? `${values.phoneCountryCode} ${values.phone}` : '-'}
          </dd>

          <dt className="text-default-600">{t('condominiums.form.fields.email.label')}</dt>
          <dd className="text-foreground">{values.email || '-'}</dd>
        </dl>
      </div>
    </div>
  )
}
