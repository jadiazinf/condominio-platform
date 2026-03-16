'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { cn } from '@heroui/theme'
import { EIdDocumentTypes } from '@packages/domain'
import { Info } from 'lucide-react'
import { useMemo } from 'react'

import { Tooltip } from '@/ui/components/tooltip'
import { Select, type ISelectItem } from '@/ui/components/select'

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
  tooltip?: string
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
  numberPlaceholder = '13245678',
  description,
  tooltip,
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

  const ID_DOCUMENT_TYPE_LABELS: Record<TIdDocumentType, string> = {
    J: 'J - Jurídico',
    G: 'G - Gobierno',
    V: 'V - Venezolano',
    E: 'E - Extranjero',
    P: 'P - Pasaporte',
  }

  const documentTypeItems: ISelectItem[] = useMemo(
    () => EIdDocumentTypes.map(type => ({ key: type, label: ID_DOCUMENT_TYPE_LABELS[type] })),
    []
  )

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-small text-foreground-500 flex items-center gap-1">
          {isRequired && <span className="text-danger">*</span>}
          <span>{label}</span>
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
          aria-label="Document type"
          className="w-[160px] shrink-0"
          classNames={{
            trigger: 'min-h-unit-10',
          }}
          isDisabled={isDisabled || isReadOnly}
          isInvalid={!!documentTypeError}
          items={documentTypeItems}
          placeholder={typePlaceholder}
          radius={radius}
          size={size}
          value={documentType || typePlaceholder || undefined}
          variant={variant}
          onChange={key => onDocumentTypeChange?.((key as TIdDocumentType) || null)}
        />
        <HeroUIInput
          className="flex-1"
          classNames={{
            input: 'placeholder:text-default-400 placeholder:opacity-70',
          }}
          isDisabled={isDisabled}
          isInvalid={!!documentNumberError}
          isReadOnly={isReadOnly}
          placeholder={numberPlaceholder}
          radius={radius}
          size={size}
          value={documentNumber || ''}
          variant={variant}
          onValueChange={onDocumentNumberChange}
        />
      </div>
      {description && !isInvalid && <p className="text-tiny text-foreground-400">{description}</p>}
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { IDocumentInputProps, TIdDocumentType }
