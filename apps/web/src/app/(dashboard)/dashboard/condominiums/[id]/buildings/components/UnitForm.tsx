'use client'

import { InputField } from '@/ui/components/input'

interface IUnitFormProps {
  translateError?: (message: string | undefined) => string | undefined
  translations: {
    unitNumber: string
    unitNumberPlaceholder: string
    floor: string
    area: string
    bedrooms: string
    bathrooms: string
    parkingSpaces: string
    aliquotPercentage: string
  }
}

export function UnitForm({ translateError, translations }: IUnitFormProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Basic Information */}
      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
        <InputField
          name="unitNumber"
          label={translations.unitNumber}
          placeholder={translations.unitNumberPlaceholder}
          isRequired
          translateError={translateError}
        />
        <InputField
          name="floor"
          label={translations.floor}
          type="number"
          translateError={translateError}
        />
      </div>

      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-3">
        <InputField name="areaM2" label={translations.area} translateError={translateError} />
        <InputField
          name="bedrooms"
          label={translations.bedrooms}
          type="number"
          translateError={translateError}
        />
        <InputField
          name="bathrooms"
          label={translations.bathrooms}
          type="number"
          translateError={translateError}
        />
      </div>

      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
        <InputField
          name="parkingSpaces"
          label={translations.parkingSpaces}
          type="number"
          translateError={translateError}
        />
        <InputField
          name="aliquotPercentage"
          label={translations.aliquotPercentage}
          translateError={translateError}
        />
      </div>
    </div>
  )
}
