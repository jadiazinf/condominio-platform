'use client'

import { InputField } from '@/ui/components/input'
import { PhoneInputField } from '@/ui/components/phone-input'
import { DocumentInputField } from '@/ui/components/document-input'

interface IUserBasicInfoFieldsProps {
  /** Prefix for field names (e.g., "admin." for nested forms) */
  fieldPrefix?: string
  /** Function to translate error messages */
  translateError?: (message: string | undefined) => string | undefined
  /** Labels and placeholders */
  labels: {
    email: string
    emailPlaceholder: string
    emailTooltip?: string
    firstName: string
    firstNamePlaceholder: string
    firstNameTooltip?: string
    lastName: string
    lastNamePlaceholder: string
    lastNameTooltip?: string
    phone: string
    phonePlaceholder?: string
    phoneTooltip?: string
    idDocument: string
    idDocumentTypePlaceholder: string
    idDocumentNumberPlaceholder: string
    idDocumentTooltip?: string
  }
  /** Whether to show document fields */
  showDocumentFields?: boolean
}

/**
 * Reusable user basic information fields component
 * Used in both CreateUserForm and AdminStepForm to maintain consistency
 */
export function UserBasicInfoFields({
  fieldPrefix = '',
  translateError,
  labels,
  showDocumentFields = true,
}: IUserBasicInfoFieldsProps) {
  const getFieldName = (name: string) => `${fieldPrefix}${name}`

  return (
    <div className="flex flex-col gap-10">
      {/* Email */}
      <InputField
        name={getFieldName('email')}
        type="email"
        label={labels.email}
        placeholder={labels.emailPlaceholder}
        tooltip={labels.emailTooltip}
        isRequired
        translateError={translateError}
      />

      {/* First Name & Last Name */}
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
        <InputField
          name={getFieldName('firstName')}
          label={labels.firstName}
          placeholder={labels.firstNamePlaceholder}
          tooltip={labels.firstNameTooltip}
          isRequired
          translateError={translateError}
        />
        <InputField
          name={getFieldName('lastName')}
          label={labels.lastName}
          placeholder={labels.lastNamePlaceholder}
          tooltip={labels.lastNameTooltip}
          isRequired
          translateError={translateError}
        />
      </div>

      {/* Document Fields (optional) */}
      {showDocumentFields && (
        <DocumentInputField
          documentTypeFieldName={getFieldName('idDocumentType')}
          documentNumberFieldName={getFieldName('idDocumentNumber')}
          label={labels.idDocument}
          typePlaceholder={labels.idDocumentTypePlaceholder}
          numberPlaceholder={labels.idDocumentNumberPlaceholder}
          tooltip={labels.idDocumentTooltip}
          isRequired
          translateError={translateError}
        />
      )}

      {/* Phone */}
      <PhoneInputField
        countryCodeFieldName={getFieldName('phoneCountryCode')}
        phoneNumberFieldName={getFieldName('phoneNumber')}
        label={labels.phone}
        tooltip={labels.phoneTooltip}
        isRequired
        translateError={translateError}
      />
    </div>
  )
}

export type { IUserBasicInfoFieldsProps }
