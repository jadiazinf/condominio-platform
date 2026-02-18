'use client'

import { InputField } from '@/ui/components/input'
import { TCreateBuildingVariables } from '@packages/http-client/hooks'
import { useFormContext } from 'react-hook-form'

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
        name="floorsCount"
        label={translations.floors}
        type="number"
        translateError={translateError}
      />
    </div>
  )
}
