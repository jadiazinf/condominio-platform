'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { CurrencyInput, type ICurrencyInputProps } from './CurrencyInput'
import { getTranslatedError } from '@/utils/formErrors'

interface ICurrencyInputFieldProps extends Omit<ICurrencyInputProps, 'value' | 'onValueChange' | 'isInvalid'> {
  name: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * CurrencyInput component integrated with react-hook-form
 *
 * @example
 * <FormProvider {...methods}>
 *   <CurrencyInputField
 *     name="basePrice"
 *     label="Precio"
 *     isRequired
 *   />
 * </FormProvider>
 */
export function CurrencyInputField({
  name,
  translateError,
  errorMessage: customErrorMessage,
  ...props
}: ICurrencyInputFieldProps) {
  const { control, formState: { errors } } = useFormContext()

  const formErrorMessage = getTranslatedError(errors, name, translateError)
  const finalErrorMessage = customErrorMessage || formErrorMessage

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <CurrencyInput
          value={field.value || ''}
          onValueChange={field.onChange}
          isInvalid={!!finalErrorMessage}
          errorMessage={finalErrorMessage}
          {...props}
        />
      )}
    />
  )
}

export type { ICurrencyInputFieldProps }
