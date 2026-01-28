'use client'

import { Textarea as HeroUITextarea } from '@heroui/input'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { ReactNode, forwardRef } from 'react'
import { Info } from 'lucide-react'

type TTextareaSize = 'sm' | 'md' | 'lg'

type TTextareaColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TTextareaVariant = 'flat' | 'bordered' | 'underlined' | 'faded'

type TTextareaRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TLabelPlacement = 'inside' | 'outside' | 'outside-left'

interface ITextareaProps {
  size?: TTextareaSize
  color?: TTextareaColor
  variant?: TTextareaVariant
  radius?: TTextareaRadius
  label?: string
  labelPlacement?: TLabelPlacement
  placeholder?: string
  description?: string
  tooltip?: string
  errorMessage?: string
  value?: string
  defaultValue?: string
  minRows?: number
  maxRows?: number
  minLength?: number
  maxLength?: number
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  disableAutosize?: boolean
  fullWidth?: boolean
  startContent?: ReactNode
  endContent?: ReactNode
  className?: string
  classNames?: {
    base?: string
    label?: string
    inputWrapper?: string
    innerWrapper?: string
    input?: string
    description?: string
    errorMessage?: string
    helperWrapper?: string
  }
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (value: string) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
}

export const Textarea = forwardRef<HTMLTextAreaElement, ITextareaProps>(function Textarea({
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
  minRows = 3,
  maxRows = 8,
  minLength,
  maxLength,
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  disableAutosize = false,
  fullWidth = false,
  startContent,
  endContent,
  className,
  classNames,
  onChange,
  onValueChange,
  onKeyPress,
}, ref) {
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

  return (
    <HeroUITextarea
      ref={ref}
      className={cn(className)}
      classNames={classNames}
      color={color}
      defaultValue={defaultValue}
      description={tooltip ? undefined : description}
      disableAutosize={disableAutosize}
      endContent={endContent}
      errorMessage={errorMessage}
      fullWidth={fullWidth}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isReadOnly={isReadOnly}
      isRequired={false}
      label={labelContent}
      labelPlacement={labelPlacement}
      maxLength={maxLength}
      maxRows={maxRows}
      minLength={minLength}
      minRows={minRows}
      placeholder={placeholder}
      radius={radius}
      size={size}
      startContent={startContent}
      value={value}
      variant={variant}
      onChange={onChange}
      onKeyPress={onKeyPress}
      onValueChange={onValueChange}
    />
  )
})

export type {
  TTextareaSize,
  TTextareaColor,
  TTextareaVariant,
  TTextareaRadius,
  TLabelPlacement,
  ITextareaProps,
}
