'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { cn } from '@heroui/theme'
import { Info } from 'lucide-react'
import { ETaxIdTypes, type TTaxIdType } from '@packages/domain'
import { useMemo } from 'react'

import { Tooltip } from '@/ui/components/tooltip'
import { Select, type ISelectItem } from '@/ui/components/select'

type TInputSize = 'sm' | 'md' | 'lg'
type TInputVariant = 'flat' | 'bordered' | 'underlined' | 'faded'
type TInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

const TAX_ID_TYPE_LABELS: Record<TTaxIdType, string> = {
  J: 'J - Jurídico',
  G: 'G - Gobierno',
  V: 'V - Venezolano',
  E: 'E - Extranjero',
  P: 'P - Pasaporte',
}

interface ITaxIdInputProps {
  taxIdType?: TTaxIdType | null
  taxIdNumber?: string | null
  onTaxIdTypeChange?: (type: TTaxIdType | null) => void
  onTaxIdNumberChange?: (value: string) => void
  label?: string
  typePlaceholder?: string
  numberPlaceholder?: string
  tooltip?: string
  taxIdTypeError?: string
  taxIdNumberError?: string
  size?: TInputSize
  variant?: TInputVariant
  radius?: TInputRadius
  isRequired?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  className?: string
}

export function TaxIdInput({
  taxIdType,
  taxIdNumber,
  onTaxIdTypeChange,
  onTaxIdNumberChange,
  label,
  typePlaceholder = 'Tipo',
  numberPlaceholder = '123456789',
  tooltip,
  taxIdTypeError,
  taxIdNumberError,
  size = 'md',
  variant = 'bordered',
  radius = 'sm',
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  className,
}: ITaxIdInputProps) {
  const errorMessage = taxIdTypeError || taxIdNumberError

  const taxIdTypeItems: ISelectItem[] = useMemo(
    () =>
      ETaxIdTypes.map(type => ({
        key: type,
        label: TAX_ID_TYPE_LABELS[type],
      })),
    []
  )

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-small text-foreground-500 flex items-center gap-1">
          {isRequired && <span className="text-danger">*</span>}
          {label}
          {tooltip && (
            <Tooltip
              showArrow
              classNames={{
                content: 'max-w-xs text-sm',
              }}
              content={tooltip}
              placement="right"
            >
              <Info className="h-4 w-4 text-default-400 cursor-help" />
            </Tooltip>
          )}
        </label>
      )}
      <div className="flex gap-2">
        <Select
          aria-label="Tax ID type"
          className="w-[160px] shrink-0"
          classNames={{
            trigger: 'min-h-unit-10',
          }}
          isDisabled={isDisabled || isReadOnly}
          isInvalid={!!taxIdTypeError}
          items={taxIdTypeItems}
          placeholder={typePlaceholder}
          radius={radius}
          size={size}
          value={taxIdType}
          variant={variant}
          onChange={key => onTaxIdTypeChange?.((key as TTaxIdType) || null)}
        />
        <HeroUIInput
          className="flex-1"
          classNames={{
            input: 'placeholder:text-default-300',
          }}
          inputMode="numeric"
          isDisabled={isDisabled}
          isInvalid={!!taxIdNumberError}
          isReadOnly={isReadOnly}
          placeholder={numberPlaceholder}
          radius={radius}
          size={size}
          value={taxIdNumber || ''}
          variant={variant}
          onValueChange={value => onTaxIdNumberChange?.(value.replace(/\D/g, ''))}
        />
      </div>
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { ITaxIdInputProps }
