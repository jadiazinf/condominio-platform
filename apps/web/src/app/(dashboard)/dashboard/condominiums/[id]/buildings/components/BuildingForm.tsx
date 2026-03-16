'use client'

import { TCreateBuildingVariables } from '@packages/http-client/hooks'
import { useFormContext } from 'react-hook-form'

import { InputField } from '@/ui/components/input'

interface IBuildingFormProps {
  translateError?: (message: string | undefined) => string | undefined
  translations: {
    name: string
    namePlaceholder: string
    code: string
    codePlaceholder: string
    floors: string
  }
}

export function BuildingForm({ translateError, translations }: IBuildingFormProps) {
  const { control } = useFormContext<TCreateBuildingVariables>()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          isRequired
          label={translations.name}
          name="name"
          placeholder={translations.namePlaceholder}
          translateError={translateError}
        />
        <InputField
          label={translations.code}
          name="code"
          placeholder={translations.codePlaceholder}
          translateError={translateError}
        />
      </div>

      <InputField
        label={translations.floors}
        name="floorsCount"
        translateError={translateError}
        type="number"
      />
    </div>
  )
}
