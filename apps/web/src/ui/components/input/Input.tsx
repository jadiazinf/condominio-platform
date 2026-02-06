'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { ReactNode, KeyboardEvent, ClipboardEvent } from 'react'
import { Info } from 'lucide-react'

type TInputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number'

type TInputMode = 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'

type TInputSize = 'sm' | 'md' | 'lg'

type TInputColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TInputVariant = 'flat' | 'bordered' | 'underlined' | 'faded'

type TInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TLabelPlacement = 'inside' | 'outside' | 'outside-left'

interface IInputProps {
  type?: TInputType
  size?: TInputSize
  color?: TInputColor
  variant?: TInputVariant
  radius?: TInputRadius
  label?: string
  labelPlacement?: TLabelPlacement
  placeholder?: string
  description?: string
  /** Tooltip text shown on hover of info icon next to label */
  tooltip?: string
  errorMessage?: string
  value?: string
  defaultValue?: string
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  isClearable?: boolean
  fullWidth?: boolean
  startContent?: ReactNode
  endContent?: ReactNode
  className?: string
  minLength?: number
  maxLength?: number
  pattern?: string
  inputMode?: TInputMode
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (value: string) => void
  onClear?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void
}

export function Input({
  type = 'text',
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
  value,
  defaultValue,
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  isClearable = false,
  fullWidth = false,
  startContent,
  endContent,
  className,
  minLength,
  maxLength,
  pattern,
  inputMode,
  onChange,
  onValueChange,
  onClear,
  onKeyDown,
  onPaste,
}: IInputProps) {
  // Create label with tooltip and required asterisk (always on the left)
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

  return (
    <HeroUIInput
      className={cn(className)}
      color={color}
      defaultValue={defaultValue}
      description={tooltip ? undefined : description}
      endContent={endContent}
      errorMessage={errorMessage}
      fullWidth={fullWidth}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isReadOnly={isReadOnly}
      isRequired={false}
      label={labelContent}
      labelPlacement={labelPlacement}
      maxLength={maxLength}
      minLength={minLength}
      pattern={pattern}
      placeholder={placeholder}
      radius={radius}
      size={size}
      startContent={startContent}
      type={type}
      value={value}
      variant={variant}
      inputMode={inputMode}
      onChange={onChange}
      onClear={onClear}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onValueChange={onValueChange}
    />
  )
}

// Export types for external use
export type {
  TInputType,
  TInputMode,
  TInputSize,
  TInputColor,
  TInputVariant,
  TInputRadius,
  TLabelPlacement,
  IInputProps,
}
