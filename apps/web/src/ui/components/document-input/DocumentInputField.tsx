'use client'

import { Controller, useFormContext } from 'react-hook-form'

import { DocumentInput, type IDocumentInputProps, type TIdDocumentType } from './DocumentInput'

import { getTranslatedError } from '@/utils/formErrors'

interface IDocumentInputFieldProps
  extends Omit<
    IDocumentInputProps,
    | 'documentType'
    | 'documentNumber'
    | 'onDocumentTypeChange'
    | 'onDocumentNumberChange'
    | 'documentTypeError'
    | 'documentNumberError'
  > {
  documentTypeFieldName: string
  documentNumberFieldName: string
  translateError?: (message: string | undefined) => string | undefined
}

/**
 * DocumentInput component integrated with react-hook-form
 *
 * @example
 * <DocumentInputField
 *   documentTypeFieldName="idDocumentType"
 *   documentNumberFieldName="idDocumentNumber"
 *   label="Document"
 *   typePlaceholder="Type"
 *   numberPlaceholder="Number"
 * />
 */
export function DocumentInputField({
  documentTypeFieldName,
  documentNumberFieldName,
  translateError,
  ...props
}: IDocumentInputFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  return (
    <Controller
      control={control}
      name={documentTypeFieldName}
      render={({ field: typeField }) => (
        <Controller
          control={control}
          name={documentNumberFieldName}
          render={({ field: numberField }) => (
            <DocumentInput
              documentNumber={numberField.value || ''}
              documentNumberError={getTranslatedError(
                errors,
                documentNumberFieldName,
                translateError
              )}
              documentType={typeField.value as TIdDocumentType | null}
              documentTypeError={getTranslatedError(errors, documentTypeFieldName, translateError)}
              onDocumentNumberChange={value => numberField.onChange(value)}
              onDocumentTypeChange={value => typeField.onChange(value)}
              {...props}
            />
          )}
        />
      )}
    />
  )
}

export type { IDocumentInputFieldProps }
