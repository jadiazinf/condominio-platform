'use client'

import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'

import { useFormContext, Controller } from 'react-hook-form'

import { Input, Label, PhoneInput } from '@/ui/components'
import { useTranslation } from '@/contexts'

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
        control={control}
        name="phoneCountryCode"
        render={({ field: countryCodeField }) => (
          <Controller
            control={control}
            name="phone"
            render={({ field: phoneField }) => (
              <PhoneInput
                isRequired
                countryCode={countryCodeField.value}
                countryCodeError={errors.phoneCountryCode?.message}
                label={t('condominiums.form.fields.phoneNumber.label')}
                phoneNumber={phoneField.value}
                phoneNumberError={errors.phone?.message}
                onCountryCodeChange={countryCodeField.onChange}
                onPhoneNumberChange={phoneField.onChange}
              />
            )}
            rules={{
              required: t('condominiums.form.fields.phoneNumber.required'),
              maxLength: {
                value: 50,
                message: t('condominiums.form.fields.phoneNumber.maxLengthError'),
              },
            }}
          />
        )}
        rules={{
          required: t('condominiums.form.fields.phoneNumber.required'),
        }}
      />

      <div className="space-y-2">
        <Label required htmlFor="email">
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
          error={errors.email?.message}
          placeholder={t('condominiums.form.fields.email.placeholder')}
        />
      </div>
    </div>
  )
}
