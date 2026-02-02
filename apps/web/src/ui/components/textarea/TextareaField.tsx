'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { Textarea, type ITextareaProps } from './Textarea'
import { getTranslatedError } from '@/utils/formErrors'

interface ITextareaFieldProps extends Omit<ITextareaProps, 'value' | 'onValueChange' | 'isInvalid' | 'errorMessage'> {
  name: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * Textarea component integrated with react-hook-form
 * 
 * @example
 * <FormProvider {...methods}>
 *   <TextareaField
 *     name="description"
 *     label="Description"
 *     minRows={4}
 *   />
 * </FormProvider>
 */
export function TextareaField({
  name,
  translateError,
  ...props
}: ITextareaFieldProps) {
  const { control, formState: { errors } } = useFormContext()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Textarea
          value={field.value || ''}
          onValueChange={field.onChange}
          isInvalid={!!getTranslatedError(errors, name, translateError)}
          errorMessage={getTranslatedError(errors, name, translateError)}
          {...props}
        />
      )}
    />
  )
}

export type { ITextareaFieldProps }
