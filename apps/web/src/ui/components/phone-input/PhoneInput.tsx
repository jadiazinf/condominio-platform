'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { cn } from '@heroui/theme'
import { Info } from 'lucide-react'
import {
  PHONE_COUNTRY_CODES,
  DEFAULT_PHONE_COUNTRY_CODE,
  PHONE_PLACEHOLDERS,
  DEFAULT_PHONE_PLACEHOLDER,
} from '@packages/domain'
import { useMemo } from 'react'

import { Tooltip } from '@/ui/components/tooltip'
import { Select, type ISelectItem } from '@/ui/components/select'

type TInputSize = 'sm' | 'md' | 'lg'
type TInputVariant = 'flat' | 'bordered' | 'underlined' | 'faded'
type TInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface IPhoneInputProps {
  countryCode?: string | null
  phoneNumber?: string | null
  onCountryCodeChange?: (code: string | null) => void
  onPhoneNumberChange?: (value: string) => void
  label?: string
  placeholder?: string
  tooltip?: string
  countryCodeError?: string
  phoneNumberError?: string
  size?: TInputSize
  variant?: TInputVariant
  radius?: TInputRadius
  isRequired?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  isCountryCodeReadOnly?: boolean
  className?: string
}

export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  label,
  placeholder,
  tooltip,
  countryCodeError,
  phoneNumberError,
  size = 'md',
  variant = 'bordered',
  radius = 'sm',
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  isCountryCodeReadOnly = false,
  className,
}: IPhoneInputProps) {
  const selectedCountryCode = countryCode || DEFAULT_PHONE_COUNTRY_CODE
  const derivedPlaceholder =
    placeholder ?? PHONE_PLACEHOLDERS[selectedCountryCode] ?? DEFAULT_PHONE_PLACEHOLDER
  const errorMessage = countryCodeError || phoneNumberError

  const countryCodeItems: ISelectItem[] = useMemo(
    () =>
      PHONE_COUNTRY_CODES.map(item => ({
        key: item.code,
        label: `${item.flag} ${item.code}`,
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          aria-label="Country code"
          className="w-full sm:w-[140px] shrink-0"
          classNames={{
            trigger: 'min-h-unit-10',
          }}
          isDisabled={isDisabled || isReadOnly || isCountryCodeReadOnly}
          isInvalid={!!countryCodeError}
          items={countryCodeItems}
          radius={radius}
          size={size}
          value={selectedCountryCode}
          variant={variant}
          onChange={key => onCountryCodeChange?.(key)}
        />
        <HeroUIInput
          className="flex-1"
          classNames={{
            input: 'placeholder:text-default-400 placeholder:opacity-70',
          }}
          isDisabled={isDisabled}
          isInvalid={!!phoneNumberError}
          isReadOnly={isReadOnly}
          placeholder={derivedPlaceholder}
          radius={radius}
          size={size}
          type="tel"
          value={phoneNumber || ''}
          variant={variant}
          onValueChange={onPhoneNumberChange}
        />
      </div>
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { IPhoneInputProps }
