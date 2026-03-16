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
          isRequired
          label={translations.unitNumber}
          name="unitNumber"
          placeholder={translations.unitNumberPlaceholder}
          translateError={translateError}
        />
        <InputField
          label={translations.floor}
          name="floor"
          translateError={translateError}
          type="number"
        />
      </div>

      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-3">
        <InputField label={translations.area} name="areaM2" translateError={translateError} />
        <InputField
          label={translations.bedrooms}
          name="bedrooms"
          translateError={translateError}
          type="number"
        />
        <InputField
          label={translations.bathrooms}
          name="bathrooms"
          translateError={translateError}
          type="number"
        />
      </div>

      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
        <InputField
          label={translations.parkingSpaces}
          name="parkingSpaces"
          translateError={translateError}
          type="number"
        />
        <InputField
          label={translations.aliquotPercentage}
          name="aliquotPercentage"
          translateError={translateError}
        />
      </div>
    </div>
  )
}
