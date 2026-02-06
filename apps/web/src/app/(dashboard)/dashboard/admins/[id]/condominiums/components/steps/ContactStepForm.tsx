'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Input, Label, PhoneInput } from '@/ui/components'
import { useTranslation } from '@/contexts'
import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'
import { useMemo } from 'react'

// Map of phone placeholders by country code
const PHONE_PLACEHOLDERS: Record<string, string> = {
  '+58': '(412) 123-4567', // Venezuela
  '+1': '(555) 123-4567', // USA/Canada
  '+34': '612 345 678', // España
  '+52': '55 1234 5678', // México
  '+54': '11 2345-6789', // Argentina
  '+57': '300 123 4567', // Colombia
  '+56': '9 1234 5678', // Chile
  '+51': '987 654 321', // Perú
  '+593': '99 123 4567', // Ecuador
  '+591': '7123 4567', // Bolivia
}

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
        render={({ field: countryCodeField }) => {
          // Get dynamic placeholder based on selected country code
          const phonePlaceholder = useMemo(() => {
            const code = countryCodeField.value || '+58'
            return PHONE_PLACEHOLDERS[code] || '123-4567'
          }, [countryCodeField.value])

          return (
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
                  placeholder={phonePlaceholder}
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
          )
        }}
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
