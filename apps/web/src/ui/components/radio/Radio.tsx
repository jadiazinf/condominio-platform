'use client'

import {
  RadioGroup as HeroUIRadioGroup,
  Radio as HeroUIRadio,
} from '@heroui/radio'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TRadioSize = 'sm' | 'md' | 'lg'

type TRadioColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TRadioOrientation = 'horizontal' | 'vertical'

interface IRadioGroupProps {
  label?: string
  description?: string
  errorMessage?: string
  orientation?: TRadioOrientation
  size?: TRadioSize
  color?: TRadioColor
  value?: string
  defaultValue?: string
  isRequired?: boolean
  isReadOnly?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  className?: string
  classNames?: {
    base?: string
    wrapper?: string
    label?: string
    description?: string
    errorMessage?: string
  }
  children: ReactNode
  onValueChange?: (value: string) => void
}

export function RadioGroup({
  label,
  description,
  errorMessage,
  orientation = 'vertical',
  size = 'md',
  color = 'primary',
  value,
  defaultValue,
  isRequired = false,
  isReadOnly = false,
  isDisabled = false,
  isInvalid = false,
  className,
  classNames,
  children,
  onValueChange,
}: IRadioGroupProps) {
  return (
    <HeroUIRadioGroup
      className={cn(className)}
      classNames={classNames}
      color={color}
      defaultValue={defaultValue}
      description={description}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      label={label}
      orientation={orientation}
      size={size}
      value={value}
      onValueChange={onValueChange}
    >
      {children}
    </HeroUIRadioGroup>
  )
}

interface IRadioProps {
  value: string
  size?: TRadioSize
  color?: TRadioColor
  description?: string
  isDisabled?: boolean
  className?: string
  classNames?: {
    base?: string
    wrapper?: string
    control?: string
    label?: string
    description?: string
    labelWrapper?: string
  }
  children?: ReactNode
}

export function Radio({
  value,
  size = 'md',
  color = 'primary',
  description,
  isDisabled = false,
  className,
  classNames,
  children,
}: IRadioProps) {
  return (
    <HeroUIRadio
      className={cn(className)}
      classNames={classNames}
      color={color}
      description={description}
      isDisabled={isDisabled}
      size={size}
      value={value}
    >
      {children}
    </HeroUIRadio>
  )
}

export type {
  TRadioSize,
  TRadioColor,
  TRadioOrientation,
  IRadioGroupProps,
  IRadioProps,
}
