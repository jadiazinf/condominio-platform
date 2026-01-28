'use client'

import { Checkbox as HeroUICheckbox } from '@heroui/checkbox'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TCheckboxSize = 'sm' | 'md' | 'lg'

type TCheckboxColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TCheckboxRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface ICheckboxProps {
  children?: ReactNode
  size?: TCheckboxSize
  color?: TCheckboxColor
  radius?: TCheckboxRadius
  value?: string
  name?: string
  isSelected?: boolean
  defaultSelected?: boolean
  isRequired?: boolean
  isReadOnly?: boolean
  isDisabled?: boolean
  isIndeterminate?: boolean
  isInvalid?: boolean
  lineThrough?: boolean
  className?: string
  onChange?: (isSelected: boolean) => void
  onValueChange?: (isSelected: boolean) => void
}

export function Checkbox({
  children,
  size = 'md',
  color = 'primary',
  radius = 'sm',
  value,
  name,
  isSelected,
  defaultSelected,
  isRequired = false,
  isReadOnly = false,
  isDisabled = false,
  isIndeterminate = false,
  isInvalid = false,
  lineThrough = false,
  className,
  onChange,
  onValueChange,
}: ICheckboxProps) {
  return (
    <HeroUICheckbox
      className={cn(className)}
      color={color}
      defaultSelected={defaultSelected}
      isDisabled={isDisabled}
      isIndeterminate={isIndeterminate}
      isInvalid={isInvalid}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      isSelected={isSelected}
      lineThrough={lineThrough}
      name={name}
      radius={radius}
      size={size}
      value={value}
      onChange={(e) => onChange?.(e.target.checked)}
      onValueChange={onValueChange}
    >
      {children}
    </HeroUICheckbox>
  )
}

export type {
  TCheckboxSize,
  TCheckboxColor,
  TCheckboxRadius,
  ICheckboxProps,
}
