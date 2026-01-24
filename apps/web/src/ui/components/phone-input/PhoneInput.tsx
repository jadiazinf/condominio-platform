'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { Info } from 'lucide-react'
import { PHONE_COUNTRY_CODES, DEFAULT_PHONE_COUNTRY_CODE } from '@packages/domain'

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
  className,
}: IPhoneInputProps) {
  const selectedCountryCode = countryCode || DEFAULT_PHONE_COUNTRY_CODE
  const errorMessage = countryCodeError || phoneNumberError

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
          aria-label="Country code"
          className="w-[140px] shrink-0"
          selectedKeys={selectedCountryCode ? [selectedCountryCode] : []}
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as string | undefined
            onCountryCodeChange?.(selected || null)
          }}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled || isReadOnly}
          isInvalid={!!countryCodeError}
          classNames={{
            trigger: 'min-h-unit-10',
          }}
        >
          {PHONE_COUNTRY_CODES.map(item => (
            <SelectItem key={item.code} textValue={item.code}>
              <span className="flex items-center gap-2">
                <span>{item.flag}</span>
                <span>{item.code}</span>
              </span>
            </SelectItem>
          ))}
        </Select>
        <HeroUIInput
          className="flex-1"
          type="tel"
          placeholder={placeholder}
          value={phoneNumber || ''}
          onValueChange={onPhoneNumberChange}
          variant={variant}
          radius={radius}
          size={size}
          isDisabled={isDisabled}
          isReadOnly={isReadOnly}
          isInvalid={!!phoneNumberError}
        />
      </div>
      {errorMessage && <p className="text-tiny text-danger">{errorMessage}</p>}
    </div>
  )
}

export type { IPhoneInputProps }
