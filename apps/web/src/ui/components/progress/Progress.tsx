'use client'

import { Progress as HeroUIProgress } from '@heroui/progress'
import { cn } from '@heroui/theme'

type TProgressSize = 'sm' | 'md' | 'lg'

type TProgressColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TProgressRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface IProgressProps {
  value?: number
  minValue?: number
  maxValue?: number
  size?: TProgressSize
  color?: TProgressColor
  radius?: TProgressRadius
  label?: string
  valueLabel?: string
  showValueLabel?: boolean
  isIndeterminate?: boolean
  isStriped?: boolean
  isDisabled?: boolean
  formatOptions?: Intl.NumberFormatOptions
  className?: string
  classNames?: {
    base?: string
    track?: string
    indicator?: string
    value?: string
    label?: string
    labelWrapper?: string
  }
  'aria-label'?: string
}

export function Progress({
  value,
  minValue = 0,
  maxValue = 100,
  size = 'md',
  color = 'primary',
  radius = 'full',
  label,
  valueLabel,
  showValueLabel = false,
  isIndeterminate = false,
  isStriped = false,
  isDisabled = false,
  formatOptions,
  className,
  classNames,
  'aria-label': ariaLabel,
}: IProgressProps) {
  return (
    <HeroUIProgress
      aria-label={ariaLabel}
      className={cn(className)}
      classNames={classNames}
      color={color}
      formatOptions={formatOptions}
      isDisabled={isDisabled}
      isIndeterminate={isIndeterminate}
      isStriped={isStriped}
      label={label}
      maxValue={maxValue}
      minValue={minValue}
      radius={radius}
      showValueLabel={showValueLabel}
      size={size}
      value={value}
      valueLabel={valueLabel}
    />
  )
}

export type { TProgressSize, TProgressColor, TProgressRadius, IProgressProps }
