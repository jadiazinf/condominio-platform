'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { Select, type ISelectProps } from './Select'
import { getTranslatedError } from '@/utils/formErrors'

interface ISelectFieldProps extends Omit<ISelectProps, 'selectedKeys' | 'onSelectionChange' | 'value' | 'onChange' | 'isInvalid' | 'errorMessage'> {
  name: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * Select component integrated with react-hook-form
 * 
 * @example
 * <FormProvider {...methods}>
 *   <SelectField
 *     name="roleId"
 *     label="Role"
 *     items={roles}
 *   />
 * </FormProvider>
 */
export function SelectField({
  name,
  translateError,
  ...props
}: ISelectFieldProps) {
  const { control, formState: { errors } } = useFormContext()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          selectedKeys={field.value ? [field.value] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0]
            field.onChange(selected)
          }}
          isInvalid={!!getTranslatedError(errors, name, translateError)}
          errorMessage={getTranslatedError(errors, name, translateError)}
          {...props}
        />
      )}
    />
  )
}

export type { ISelectFieldProps }
