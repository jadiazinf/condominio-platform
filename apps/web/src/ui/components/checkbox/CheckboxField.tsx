'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { Checkbox, type ICheckboxProps } from './Checkbox'

interface ICheckboxFieldProps extends Omit<ICheckboxProps, 'isSelected' | 'onValueChange'> {
  name: string
}

/**
 * Checkbox component integrated with react-hook-form
 * 
 * @example
 * <FormProvider {...methods}>
 *   <CheckboxField
 *     name="acceptTerms"
 *   >
 *     I accept the terms
 *   </CheckboxField>
 * </FormProvider>
 */
export function CheckboxField({
  name,
  ...props
}: ICheckboxFieldProps) {
  const { control } = useFormContext()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Checkbox
          isSelected={field.value || false}
          onValueChange={field.onChange}
          {...props}
        />
      )}
    />
  )
}

export type { ICheckboxFieldProps }
