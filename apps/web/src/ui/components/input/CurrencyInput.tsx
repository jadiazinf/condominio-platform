'use client'

import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react'
import { Input as HeroUIInput } from '@heroui/input'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { Info, DollarSign } from 'lucide-react'
import type { ReactNode } from 'react'

type TInputSize = 'sm' | 'md' | 'lg'
type TInputColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
type TInputVariant = 'flat' | 'bordered' | 'underlined' | 'faded'
type TInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
type TLabelPlacement = 'inside' | 'outside' | 'outside-left'

export interface ICurrencyInputProps {
  size?: TInputSize
  color?: TInputColor
  variant?: TInputVariant
  radius?: TInputRadius
  label?: string
  labelPlacement?: TLabelPlacement
  placeholder?: string
  description?: string
  tooltip?: string
  errorMessage?: string
  /** The numeric value (e.g., 213.45) */
  value?: string
  /** Called with the formatted string value (e.g., "213.45") */
  onValueChange?: (value: string) => void
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  fullWidth?: boolean
  /** Custom currency symbol, defaults to $ */
  currencySymbol?: ReactNode
  /** Show currency symbol, defaults to true */
  showCurrencySymbol?: boolean
  /** Locale for formatting (affects thousand separator), defaults to 'es-VE' */
  locale?: string
  /** Number of decimal places, defaults to 2 */
  decimals?: number
  className?: string
}

/**
 * Currency input that formats values as you type from right to left.
 *
 * Example flow:
 * - Type 2 → 0.02
 * - Type 1 → 0.21
 * - Type 3 → 2.13
 * - Type 4 → 21.34
 * - Type 5 → 213.45
 * - Type 6 → 2,134.56
 * - Delete → 213.45
 *
 * The value is stored and returned as a decimal string (e.g., "213.45").
 */
export function CurrencyInput({
  size = 'md',
  color = 'default',
  variant = 'bordered',
  radius = 'sm',
  label,
  labelPlacement = 'outside',
  placeholder,
  description,
  tooltip,
  errorMessage,
  value = '',
  onValueChange,
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  fullWidth = false,
  currencySymbol,
  showCurrencySymbol = true,
  locale = 'es-VE',
  decimals = 2,
  className,
}: ICurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Convert string value to cents (integer)
  const valueToCents = useCallback((val: string): number => {
    if (!val || val === '') return 0
    const num = parseFloat(val)
    if (isNaN(num)) return 0
    return Math.round(num * Math.pow(10, decimals))
  }, [decimals])

  // Convert cents to formatted display string
  const centsToDisplay = useCallback((cents: number): string => {
    const value = cents / Math.pow(10, decimals)
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }, [locale, decimals])

  // Convert cents to API value string
  const centsToValue = useCallback((cents: number): string => {
    const value = cents / Math.pow(10, decimals)
    return value.toFixed(decimals)
  }, [decimals])

  // Current value in cents
  const currentCents = useMemo(() => valueToCents(value), [value, valueToCents])

  // Formatted display value
  const displayValue = useMemo(() => centsToDisplay(currentCents), [currentCents, centsToDisplay])

  // Handle key press
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    // Don't process input when readonly or disabled
    if (isReadOnly || isDisabled) return

    // Allow navigation keys
    if (['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return
    }

    // Prevent default for all other keys
    e.preventDefault()

    // Handle backspace - remove last digit
    if (e.key === 'Backspace') {
      const newCents = Math.floor(currentCents / 10)
      onValueChange?.(centsToValue(newCents))
      return
    }

    // Handle delete - same as backspace
    if (e.key === 'Delete') {
      const newCents = Math.floor(currentCents / 10)
      onValueChange?.(centsToValue(newCents))
      return
    }

    // Only allow numeric input
    if (!/^[0-9]$/.test(e.key)) {
      return
    }

    // Add new digit
    const digit = parseInt(e.key, 10)
    const newCents = currentCents * 10 + digit

    // Prevent overflow (max safe integer consideration)
    if (newCents > 999999999999) {
      return
    }

    onValueChange?.(centsToValue(newCents))
  }, [currentCents, onValueChange, centsToValue, isReadOnly, isDisabled])

  // Handle paste - extract only numbers
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isReadOnly || isDisabled) return
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')

    // Extract only digits from pasted text
    const digits = pastedText.replace(/\D/g, '')

    if (digits.length === 0) return

    // Process each digit
    let newCents = currentCents
    for (const char of digits) {
      const digit = parseInt(char, 10)
      newCents = newCents * 10 + digit
      if (newCents > 999999999999) {
        break
      }
    }

    onValueChange?.(centsToValue(newCents))
  }, [currentCents, onValueChange, centsToValue, isReadOnly, isDisabled])

  // Create label with tooltip and required asterisk
  const labelContent = label ? (
    <span className="flex items-center gap-1.5">
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
          <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
        </Tooltip>
      )}
    </span>
  ) : undefined

  const startContent = showCurrencySymbol ? (
    currencySymbol || <DollarSign className="text-default-400" size={16} />
  ) : undefined

  return (
    <HeroUIInput
      ref={inputRef}
      className={cn(className)}
      color={color}
      description={tooltip ? undefined : description}
      endContent={null}
      errorMessage={errorMessage}
      fullWidth={fullWidth}
      inputMode="numeric"
      isClearable={false}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isReadOnly={isReadOnly}
      isRequired={false}
      label={labelContent}
      labelPlacement={labelPlacement}
      placeholder={placeholder || '0.00'}
      radius={radius}
      size={size}
      startContent={startContent}
      type="text"
      value={displayValue}
      variant={variant}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      // Prevent normal onChange since we handle input via keyDown
      onChange={() => {}}
    />
  )
}
