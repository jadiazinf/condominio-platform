'use client'

import type { TTaxIdType } from '@packages/domain'

import { Controller, useFormContext } from 'react-hook-form'

import { TaxIdInput, type ITaxIdInputProps } from './TaxIdInput'

import { getTranslatedError } from '@/utils/formErrors'

interface ITaxIdInputFieldProps
  extends Omit<
    ITaxIdInputProps,
    | 'taxIdType'
    | 'taxIdNumber'
    | 'onTaxIdTypeChange'
    | 'onTaxIdNumberChange'
    | 'taxIdTypeError'
    | 'taxIdNumberError'
  > {
  taxIdTypeFieldName: string
  taxIdNumberFieldName: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * TaxIdInput component integrated with react-hook-form
 *
 * @example
 * <TaxIdInputField
 *   taxIdTypeFieldName="taxIdType"
 *   taxIdNumberFieldName="taxIdNumber"
 *   label="RIF"
 * />
 */
export function TaxIdInputField({
  taxIdTypeFieldName,
  taxIdNumberFieldName,
  translateError,
  ...props
}: ITaxIdInputFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  return (
    <Controller
      control={control}
      name={taxIdTypeFieldName}
      render={({ field: typeField }) => (
        <Controller
          control={control}
          name={taxIdNumberFieldName}
          render={({ field: numberField }) => (
            <TaxIdInput
              taxIdNumber={numberField.value || ''}
              taxIdNumberError={getTranslatedError(errors, taxIdNumberFieldName, translateError)}
              taxIdType={typeField.value as TTaxIdType | null}
              taxIdTypeError={getTranslatedError(errors, taxIdTypeFieldName, translateError)}
              onTaxIdNumberChange={value => numberField.onChange(value)}
              onTaxIdTypeChange={value => typeField.onChange(value)}
              {...props}
            />
          )}
        />
      )}
    />
  )
}

export type { ITaxIdInputFieldProps }
