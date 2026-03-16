'use client'

import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'

import { useFormContext, Controller } from 'react-hook-form'

import { Label, Textarea, LocationSelector } from '@/ui/components'
import { useTranslation } from '@/contexts'

export function LocationStepForm() {
  const { t } = useTranslation()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ICondominiumFormData>()

  return (
    <div className="space-y-6">
      <Controller
        control={control}
        name="locationId"
        render={({ field }) => (
          <LocationSelector
            isRequired
            errorMessage={errors.locationId?.message}
            label={t('condominiums.form.fields.location.label')}
            tooltip={t('condominiums.form.fields.location.description')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
        rules={{
          required: t('condominiums.form.fields.location.error'),
        }}
      />

      <div className="space-y-2">
        <Label required htmlFor="address">
          {t('condominiums.form.fields.address.label')}
        </Label>
        <Textarea
          id="address"
          {...register('address', {
            required: t('condominiums.form.fields.address.error'),
            maxLength: {
              value: 500,
              message: t('condominiums.form.fields.address.maxLengthError'),
            },
          })}
          error={errors.address?.message}
          placeholder={t('condominiums.form.fields.address.placeholder')}
          rows={3}
        />
      </div>
    </div>
  )
}
