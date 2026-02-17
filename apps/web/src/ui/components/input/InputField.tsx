'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { Input, type IInputProps } from './Input'
import { getTranslatedError } from '@/utils/formErrors'

interface IInputFieldProps
  extends Omit<IInputProps, 'value' | 'onValueChange' | 'onChange' | 'isInvalid'> {
  name: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * Input component integrated with react-hook-form
 *
 * @example
 * <FormProvider {...methods}>
 *   <InputField
 *     name="email"
 *     type="email"
 *     label="Email"
 *     isRequired
 *   />
 * </FormProvider>
 */
export function InputField({
  name,
  translateError,
  errorMessage: customErrorMessage,
  ...props
}: IInputFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  const formErrorMessage = getTranslatedError(errors, name, translateError)
  const finalErrorMessage = customErrorMessage || formErrorMessage

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
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

export type { IInputFieldProps }
