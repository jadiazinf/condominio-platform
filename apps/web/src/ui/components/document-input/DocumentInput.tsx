'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Tooltip } from '@/ui/components/tooltip'
import { cn } from '@heroui/theme'
import { EIdDocumentTypes } from '@packages/domain'
import { Info } from 'lucide-react'
import { useMemo } from 'react'

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

  const documentTypeItems: ISelectItem[] = useMemo(
    () => EIdDocumentTypes.map(type => ({ key: type, label: type })),
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
          aria-label="Document type"
          className="w-[140px] shrink-0"
          placeholder={typePlaceholder}
          items={documentTypeItems}
          value={documentType || typePlaceholder || undefined}
          onChange={key => onDocumentTypeChange?.((key as TIdDocumentType) || null)}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || isReadOnly}
          isInvalid={!!documentTypeError}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        />
        <HeroUIInput
          className="flex-1"
          classNames={{
            input: 'placeholder:text-default-400 placeholder:opacity-70',
          }}
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
      {description && !isInvalid && <p className="text-tiny text-foreground-400">{description}</p>}
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { IDocumentInputProps, TIdDocumentType }
