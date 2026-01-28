'use client'

import { Spinner as HeroUISpinner } from '@heroui/spinner'
import { cn } from '@heroui/theme'

type TSpinnerSize = 'sm' | 'md' | 'lg'

type TSpinnerColor = 'current' | 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

interface ISpinnerProps {
  size?: TSpinnerSize
  color?: TSpinnerColor
  label?: string
  labelColor?: TSpinnerColor
  className?: string
}

export function Spinner({
  size = 'md',
  color = 'current',
  label,
  labelColor,
  className,
}: ISpinnerProps) {
  return (
    <HeroUISpinner
      className={cn(className)}
      color={color}
      label={label}
      labelColor={labelColor}
      size={size}
    />
  )
}

export type {
  TSpinnerSize,
  TSpinnerColor,
  ISpinnerProps,
}
