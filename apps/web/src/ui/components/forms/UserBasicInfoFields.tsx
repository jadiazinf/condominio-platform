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
        isRequired
        label={labels.email}
        name={getFieldName('email')}
        placeholder={labels.emailPlaceholder}
        tooltip={labels.emailTooltip}
        translateError={translateError}
        type="email"
      />

      {/* First Name & Last Name */}
      <div className="flex flex-col gap-10 sm:flex-row sm:gap-8">
        <InputField
          isRequired
          className="flex-1"
          label={labels.firstName}
          name={getFieldName('firstName')}
          placeholder={labels.firstNamePlaceholder}
          tooltip={labels.firstNameTooltip}
          translateError={translateError}
        />
        <InputField
          isRequired
          className="flex-1"
          label={labels.lastName}
          name={getFieldName('lastName')}
          placeholder={labels.lastNamePlaceholder}
          tooltip={labels.lastNameTooltip}
          translateError={translateError}
        />
      </div>

      {/* Document Fields (optional) */}
      {showDocumentFields && (
        <DocumentInputField
          isRequired
          documentNumberFieldName={getFieldName('idDocumentNumber')}
          documentTypeFieldName={getFieldName('idDocumentType')}
          label={labels.idDocument}
          numberPlaceholder={labels.idDocumentNumberPlaceholder}
          tooltip={labels.idDocumentTooltip}
          translateError={translateError}
          typePlaceholder={labels.idDocumentTypePlaceholder}
        />
      )}

      {/* Phone */}
      <PhoneInputField
        isRequired
        countryCodeFieldName={getFieldName('phoneCountryCode')}
        label={labels.phone}
        phoneNumberFieldName={getFieldName('phoneNumber')}
        tooltip={labels.phoneTooltip}
        translateError={translateError}
      />
    </div>
  )
}

export type { IUserBasicInfoFieldsProps }
