'use client'

import { useFormContext, useController } from 'react-hook-form'

import { DatePicker, type IDatePickerProps } from './DatePicker'

interface IDatePickerFieldProps
  extends Omit<IDatePickerProps, 'value' | 'onChange' | 'errorMessage' | 'isInvalid'> {
  name: string
  translateError?: (message: string | undefined) => string | undefined
  errorMessage?: string
}

/**
 * DatePickerField integrated with react-hook-form.
 * Reads/writes a string value in YYYY-MM-DD format.
 */
function DatePickerField({
  name,
  translateError,
  errorMessage: customErrorMessage,
  ...props
}: IDatePickerFieldProps) {
  const { control } = useFormContext()
  const {
    field,
    fieldState: { error },
  } = useController({ name, control })

  const rawMessage = customErrorMessage || error?.message
  const errorMessage = translateError ? translateError(rawMessage) : rawMessage

  return (
    <DatePicker
      {...props}
      errorMessage={errorMessage}
      isInvalid={!!error}
      value={field.value || ''}
      onChange={field.onChange}
    />
  )
}

export { DatePickerField }
export type { IDatePickerFieldProps }
