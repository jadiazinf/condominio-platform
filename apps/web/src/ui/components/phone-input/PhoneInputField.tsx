'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { PhoneInput, type IPhoneInputProps } from './PhoneInput'
import { getTranslatedError } from '@/utils/formErrors'

interface IPhoneInputFieldProps
  extends Omit<
    IPhoneInputProps,
    'countryCode' | 'phoneNumber' | 'onCountryCodeChange' | 'onPhoneNumberChange' | 'countryCodeError' | 'phoneNumberError'
  > {
  countryCodeFieldName: string
  phoneNumberFieldName: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * PhoneInput component integrated with react-hook-form
 *
 * @example
 * <PhoneInputField
 *   countryCodeFieldName="phoneCountryCode"
 *   phoneNumberFieldName="phoneNumber"
 *   label="Phone"
 *   placeholder="1234567890"
 * />
 */
export function PhoneInputField({
  countryCodeFieldName,
  phoneNumberFieldName,
  translateError,
  ...props
}: IPhoneInputFieldProps) {
  const { control, formState: { errors } } = useFormContext()

  return (
    <Controller
      control={control}
      name={countryCodeFieldName}
      render={({ field: countryCodeField }) => (
        <Controller
          control={control}
          name={phoneNumberFieldName}
          render={({ field: phoneNumberField }) => (
            <PhoneInput
              countryCode={countryCodeField.value || '+58'}
              phoneNumber={phoneNumberField.value || ''}
              onCountryCodeChange={(value) => countryCodeField.onChange(value)}
              onPhoneNumberChange={(value) => phoneNumberField.onChange(value)}
              countryCodeError={getTranslatedError(errors, countryCodeFieldName, translateError)}
              phoneNumberError={getTranslatedError(errors, phoneNumberFieldName, translateError)}
              {...props}
            />
          )}
        />
      )}
    />
  )
}

export type { IPhoneInputFieldProps }
