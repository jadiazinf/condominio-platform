'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { Info } from 'lucide-react'
import { ETaxIdTypes, type TTaxIdType } from '@packages/domain'

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

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-small text-foreground-500 flex items-center gap-1">
          {isRequired && <span className="text-danger">*</span>}
          {label}
          {tooltip && (
            <Tooltip
              content={tooltip}
              placement="right"
              showArrow
              classNames={{
                content: 'max-w-xs text-sm',
              }}
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
          placeholder={typePlaceholder}
          selectedKeys={taxIdType ? [taxIdType] : []}
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as TTaxIdType | undefined
            onTaxIdTypeChange?.(selected || null)
          }}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || isReadOnly}
          isInvalid={!!taxIdTypeError}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        >
          {ETaxIdTypes.map(type => (
            <SelectItem key={type} textValue={type}>
              {TAX_ID_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </Select>
        <HeroUIInput
          className="flex-1"
          placeholder={numberPlaceholder}
          value={taxIdNumber || ''}
          onValueChange={onTaxIdNumberChange}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled}
          isReadOnly={isReadOnly}
          isInvalid={!!taxIdNumberError}
        />
      </div>
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { ITaxIdInputProps }
