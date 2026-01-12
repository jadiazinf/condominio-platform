'use client'

import { Input as HeroUIInput } from '@heroui/input'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TInputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number'

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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (value: string) => void
  onClear?: () => void
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
  onChange,
  onValueChange,
  onClear,
}: IInputProps) {
  return (
    <HeroUIInput
      className={cn(className)}
      color={color}
      defaultValue={defaultValue}
      description={description}
      endContent={endContent}
      errorMessage={errorMessage}
      fullWidth={fullWidth}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      label={label}
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
      onChange={onChange}
      onClear={onClear}
      onValueChange={onValueChange}
    />
  )
}

// Export types for external use
export type {
  TInputType,
  TInputSize,
  TInputColor,
  TInputVariant,
  TInputRadius,
  TLabelPlacement,
  IInputProps,
}
