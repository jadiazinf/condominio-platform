'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Input, Label, PhoneInput } from '@/ui/components'
import { useTranslation } from '@/contexts'
import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'

export function ContactStepForm() {
  const { t } = useTranslation()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ICondominiumFormData>()

  return (
    <div className="space-y-6">
      <Controller
        name="phoneCountryCode"
        control={control}
        rules={{
          required: t('condominiums.form.fields.phoneNumber.required'),
        }}
        render={({ field: countryCodeField }) => (
          <Controller
            name="phone"
            control={control}
            rules={{
              required: t('condominiums.form.fields.phoneNumber.required'),
              maxLength: {
                value: 50,
                message: t('condominiums.form.fields.phoneNumber.maxLengthError'),
              },
            }}
            render={({ field: phoneField }) => (
              <PhoneInput
                label={t('condominiums.form.fields.phoneNumber.label')}
                countryCode={countryCodeField.value}
                phoneNumber={phoneField.value}
                onCountryCodeChange={countryCodeField.onChange}
                onPhoneNumberChange={phoneField.onChange}
                countryCodeError={errors.phoneCountryCode?.message}
                phoneNumberError={errors.phone?.message}
                isRequired
              />
            )}
          />
        )}
      />

      <div className="space-y-2">
        <Label htmlFor="email" required>
          {t('condominiums.form.fields.email.label')}
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: t('condominiums.form.fields.email.required'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t('condominiums.form.fields.email.error'),
            },
            maxLength: {
              value: 255,
              message: t('condominiums.form.fields.email.maxLengthError'),
            },
          })}
          placeholder={t('condominiums.form.fields.email.placeholder')}
          error={errors.email?.message}
        />
      </div>
    </div>
  )
}
