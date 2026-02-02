'use client'

import { Switch as HeroUISwitch } from '@heroui/switch'
import type { SwitchProps as HeroUISwitchProps } from '@heroui/switch'
import { ReactNode } from 'react'

type TSwitchSize = 'sm' | 'md' | 'lg'
type TSwitchColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

interface ISwitchProps {
  size?: TSwitchSize
  color?: TSwitchColor
  isSelected?: boolean
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
}

export function Switch({
  size = 'md',
  color = 'primary',
  isSelected,
  defaultSelected,
  isDisabled = false,
  isReadOnly = false,
  children,
  className,
  classNames,
  onChange,
  onValueChange,
}: ISwitchProps) {
  return (
    <HeroUISwitch
      size={size}
      color={color}
      isSelected={isSelected}
      defaultSelected={defaultSelected}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      className={className}
      classNames={classNames}
      onChange={onChange}
      onValueChange={onValueChange}
    >
      {children}
    </HeroUISwitch>
  )
}

export type { TSwitchSize, TSwitchColor, ISwitchProps }
