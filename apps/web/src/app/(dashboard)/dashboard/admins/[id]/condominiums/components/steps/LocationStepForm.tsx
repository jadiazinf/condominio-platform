'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Label, Textarea, LocationSelector } from '@/ui/components'
import { useTranslation } from '@/contexts'
import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'

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
        name="locationId"
        control={control}
        rules={{
          required: t('condominiums.form.fields.location.error'),
        }}
        render={({ field }) => (
          <LocationSelector
            label={t('condominiums.form.fields.location.label')}
            tooltip={t('condominiums.form.fields.location.description')}
            value={field.value}
            onChange={field.onChange}
            errorMessage={errors.locationId?.message}
            isRequired
          />
        )}
      />

      <div className="space-y-2">
        <Label htmlFor="address" required>
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
          placeholder={t('condominiums.form.fields.address.placeholder')}
          error={errors.address?.message}
          rows={3}
        />
      </div>
    </div>
  )
}
