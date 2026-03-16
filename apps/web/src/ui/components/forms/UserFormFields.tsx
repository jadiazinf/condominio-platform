'use client'

import { Controller, useFormContext } from 'react-hook-form'

import { Input } from '@/ui/components/input'
import { DocumentInputField } from '@/ui/components/document-input'
import { PhoneInputField } from '@/ui/components/phone-input'

interface IUserFormFieldsProps {
  // Field names (for flexibility with nested forms)
  emailFieldName?: string
  firstNameFieldName?: string
  lastNameFieldName?: string
  displayNameFieldName?: string
  documentTypeFieldName?: string
  documentNumberFieldName?: string
  phoneCountryCodeFieldName?: string
  phoneNumberFieldName?: string

  // Display options
  showEmail?: boolean
  showFirstName?: boolean
  showLastName?: boolean
  showDisplayName?: boolean
  showDocumentInput?: boolean
  showPhoneInput?: boolean

  // Labels and placeholders
  emailLabel?: string
  firstNameLabel?: string
  lastNameLabel?: string
  displayNameLabel?: string
  documentLabel?: string
  phoneLabel?: string

  emailPlaceholder?: string
  firstNamePlaceholder?: string
  lastNamePlaceholder?: string
  displayNamePlaceholder?: string
  documentTypePlaceholder?: string
  documentNumberPlaceholder?: string

  // Descriptions
  displayNameDescription?: string

  // Required fields
  isEmailRequired?: boolean
  isFirstNameRequired?: boolean
  isLastNameRequired?: boolean
  isPhoneRequired?: boolean

  // Error translator
  translateError?: (message: string | undefined) => string | undefined

  // Layout
  className?: string
}

/**
 * Reusable user form fields component that integrates with react-hook-form
 *
 * @example
 * // Basic usage
 * <FormProvider {...methods}>
 *   <UserFormFields
 *     showEmail
 *     showFirstName
 *     showLastName
 *     showPhoneInput
 *   />
 * </FormProvider>
 *
 * @example
 * // With custom field names for nested forms
 * <UserFormFields
 *   emailFieldName="admin.email"
 *   firstNameFieldName="admin.firstName"
 *   lastNameFieldName="admin.lastName"
 *   showEmail
 *   showFirstName
 *   showLastName
 * />
 */
export function UserFormFields({
  // Field names
  emailFieldName = 'email',
  firstNameFieldName = 'firstName',
  lastNameFieldName = 'lastName',
  displayNameFieldName = 'displayName',
  documentTypeFieldName = 'documentType',
  documentNumberFieldName = 'documentNumber',
  phoneCountryCodeFieldName = 'phoneCountryCode',
  phoneNumberFieldName = 'phoneNumber',

  // Display options (all true by default)
  showEmail = true,
  showFirstName = true,
  showLastName = true,
  showDisplayName = false,
  showDocumentInput = false,
  showPhoneInput = true,

  // Labels
  emailLabel = 'Email',
  firstNameLabel = 'First Name',
  lastNameLabel = 'Last Name',
  displayNameLabel = 'Display Name',
  documentLabel = 'ID Document',
  phoneLabel = 'Phone',

  // Placeholders
  emailPlaceholder = 'email@example.com',
  firstNamePlaceholder = 'John',
  lastNamePlaceholder = 'Doe',
  displayNamePlaceholder = 'John Doe',
  documentTypePlaceholder = 'Type',
  documentNumberPlaceholder = 'Number',

  // Descriptions
  displayNameDescription,

  // Required
  isEmailRequired = true,
  isFirstNameRequired = false,
  isLastNameRequired = false,
  isPhoneRequired = false,

  // Error translator
  translateError,

  // Layout
  className,
}: IUserFormFieldsProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  // Helper to get nested error
  const getError = (fieldName: string) => {
    const parts = fieldName.split('.')
    let error: any = errors

    for (const part of parts) {
      error = error?.[part]
    }

    return error
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
        {showEmail && (
          <Controller
            control={control}
            name={emailFieldName}
            render={({ field }) => {
              const error = getError(emailFieldName)

              return (
                <Input
                  errorMessage={translateError ? translateError(error?.message) : error?.message}
                  isInvalid={!!error}
                  isRequired={isEmailRequired}
                  label={emailLabel}
                  placeholder={emailPlaceholder}
                  type="email"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                />
              )
            }}
          />
        )}

        {showFirstName && (
          <Controller
            control={control}
            name={firstNameFieldName}
            render={({ field }) => {
              const error = getError(firstNameFieldName)

              return (
                <Input
                  errorMessage={translateError ? translateError(error?.message) : error?.message}
                  isInvalid={!!error}
                  isRequired={isFirstNameRequired}
                  label={firstNameLabel}
                  placeholder={firstNamePlaceholder}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                />
              )
            }}
          />
        )}

        {showLastName && (
          <Controller
            control={control}
            name={lastNameFieldName}
            render={({ field }) => {
              const error = getError(lastNameFieldName)

              return (
                <Input
                  errorMessage={translateError ? translateError(error?.message) : error?.message}
                  isInvalid={!!error}
                  isRequired={isLastNameRequired}
                  label={lastNameLabel}
                  placeholder={lastNamePlaceholder}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                />
              )
            }}
          />
        )}

        {showDisplayName && (
          <Controller
            control={control}
            name={displayNameFieldName}
            render={({ field }) => {
              const error = getError(displayNameFieldName)

              return (
                <Input
                  className="sm:col-span-2"
                  description={displayNameDescription}
                  errorMessage={translateError ? translateError(error?.message) : error?.message}
                  isInvalid={!!error}
                  label={displayNameLabel}
                  placeholder={displayNamePlaceholder}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                />
              )
            }}
          />
        )}

        {showDocumentInput && (
          <DocumentInputField
            className="sm:col-span-2"
            documentNumberFieldName={documentNumberFieldName}
            documentTypeFieldName={documentTypeFieldName}
            label={documentLabel}
            numberPlaceholder={documentNumberPlaceholder}
            translateError={translateError}
            typePlaceholder={documentTypePlaceholder}
          />
        )}

        {showPhoneInput && (
          <PhoneInputField
            className="sm:col-span-2"
            countryCodeFieldName={phoneCountryCodeFieldName}
            isRequired={isPhoneRequired}
            label={phoneLabel}
            phoneNumberFieldName={phoneNumberFieldName}
            translateError={translateError}
          />
        )}
      </div>
    </div>
  )
}

export type { IUserFormFieldsProps }
