'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { cn } from '@heroui/theme'
import { EIdDocumentTypes } from '@packages/domain'

type TInputSize = 'sm' | 'md' | 'lg'
type TInputVariant = 'flat' | 'bordered' | 'underlined' | 'faded'
type TInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TIdDocumentType = (typeof EIdDocumentTypes)[number]

interface IDocumentInputProps {
  documentType?: TIdDocumentType | null
  documentNumber?: string | null
  onDocumentTypeChange?: (type: TIdDocumentType | null) => void
  onDocumentNumberChange?: (value: string) => void
  label?: string
  typePlaceholder?: string
  numberPlaceholder?: string
  description?: string
  documentTypeError?: string
  documentNumberError?: string
  size?: TInputSize
  variant?: TInputVariant
  radius?: TInputRadius
  isRequired?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  className?: string
}

export function DocumentInput({
  documentType,
  documentNumber,
  onDocumentTypeChange,
  onDocumentNumberChange,
  label,
  typePlaceholder,
  numberPlaceholder,
  description,
  documentTypeError,
  documentNumberError,
  size = 'md',
  variant = 'bordered',
  radius = 'sm',
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  className,
}: IDocumentInputProps) {
  const isInvalid = !!documentTypeError || !!documentNumberError
  const errorMessage = documentTypeError || documentNumberError

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-small text-foreground-500">
          {label}
          {isRequired && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <Select
          aria-label="Document type"
          className="w-[140px] shrink-0"
          placeholder={typePlaceholder}
          selectedKeys={documentType ? [documentType] : []}
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as TIdDocumentType | undefined
            onDocumentTypeChange?.(selected || null)
          }}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || isReadOnly}
          isInvalid={!!documentTypeError}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        >
          {EIdDocumentTypes.map(type => (
            <SelectItem key={type} textValue={type}>
              {type}
            </SelectItem>
          ))}
        </Select>
        <HeroUIInput
          className="flex-1"
          placeholder={numberPlaceholder}
          value={documentNumber || ''}
          onValueChange={onDocumentNumberChange}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled}
          isReadOnly={isReadOnly}
          isInvalid={!!documentNumberError}
        />
      </div>
      {description && !isInvalid && (
        <p className="text-tiny text-foreground-400">{description}</p>
      )}
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { IDocumentInputProps, TIdDocumentType }
