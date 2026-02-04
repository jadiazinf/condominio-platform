'use client'

import { InputField } from '@/ui/components/input'
import { SelectField } from '@/ui/components/select'
import { TCreateBuildingVariables } from '@packages/http-client/hooks'
import { useFormContext } from 'react-hook-form'

interface IBuildingFormProps {
  translateError?: (message: string | undefined) => string | undefined
  translations: {
    name: string
    namePlaceholder: string
    code: string
    codePlaceholder: string
    address: string
    addressPlaceholder: string
    floors: string
    bankInfo: string
    bankAccountHolder: string
    bankName: string
    bankAccountNumber: string
    bankAccountType: string
    accountTypes: {
      corriente: string
      ahorro: string
    }
  }
}

export function BuildingForm({ translateError, translations }: IBuildingFormProps) {
  const { control } = useFormContext<TCreateBuildingVariables>()

  const bankAccountTypeItems = [
    { key: 'Corriente', label: translations.accountTypes.corriente },
    { key: 'Ahorro', label: translations.accountTypes.ahorro },
  ]

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          name="name"
          label={translations.name}
          placeholder={translations.namePlaceholder}
          isRequired
          translateError={translateError}
        />
        <InputField
          name="code"
          label={translations.code}
          placeholder={translations.codePlaceholder}
          translateError={translateError}
        />
      </div>

      <InputField
        name="address"
        label={translations.address}
        placeholder={translations.addressPlaceholder}
        translateError={translateError}
      />

      <InputField
        name="floorsCount"
        label={translations.floors}
        type="number"
        translateError={translateError}
      />

      {/* Bank Information */}
      <div className="border-t pt-4">
        <h4 className="mb-4 text-sm font-medium text-default-700">{translations.bankInfo}</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            name="bankAccountHolder"
            label={translations.bankAccountHolder}
            translateError={translateError}
          />
          <InputField
            name="bankName"
            label={translations.bankName}
            translateError={translateError}
          />
          <InputField
            name="bankAccountNumber"
            label={translations.bankAccountNumber}
            translateError={translateError}
          />
          <SelectField
            name="bankAccountType"
            label={translations.bankAccountType}
            items={bankAccountTypeItems}
            translateError={translateError}
          />
        </div>
      </div>
    </div>
  )
}
