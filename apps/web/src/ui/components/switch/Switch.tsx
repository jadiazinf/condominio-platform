'use client'

import { Switch as HeroUISwitch } from '@heroui/switch'
import type { SwitchProps as HeroUISwitchProps } from '@heroui/switch'
import { ReactNode } from 'react'

type TSwitchSize = 'sm' | 'md' | 'lg'
type TSwitchColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

interface ISwitchProps {
  id?: string
  size?: TSwitchSize
  color?: TSwitchColor
  isSelected?: boolean
  checked?: boolean
  defaultSelected?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  children?: ReactNode
  className?: string
  classNames?: {
    base?: string
    wrapper?: string
    thumb?: string
    label?: string
    startContent?: string
    endContent?: string
  }
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (isSelected: boolean) => void
  onCheckedChange?: (isSelected: boolean) => void
}

export function Switch({
  id,
  size = 'md',
  color = 'primary',
  isSelected,
  checked,
  defaultSelected,
  isDisabled = false,
  isReadOnly = false,
  children,
  className,
  classNames,
  onChange,
  onValueChange,
  onCheckedChange,
}: ISwitchProps) {
  const selected = checked !== undefined ? checked : isSelected
  const handleChange = onCheckedChange || onValueChange

  return (
    <HeroUISwitch
      id={id}
      size={size}
      color={color}
      isSelected={selected}
      defaultSelected={defaultSelected}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      className={className}
      classNames={classNames}
      onChange={onChange}
      onValueChange={handleChange}
    >
      {children}
    </HeroUISwitch>
  )
}

export type { TSwitchSize, TSwitchColor, ISwitchProps }
