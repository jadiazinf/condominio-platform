'use client'

import { Chip as HeroUIChip } from '@heroui/chip'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TChipSize = 'sm' | 'md' | 'lg'

type TChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TChipVariant = 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'dot'

type TChipRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface IChipProps {
  children: ReactNode
  size?: TChipSize
  color?: TChipColor
  variant?: TChipVariant
  radius?: TChipRadius
  isDisabled?: boolean
  startContent?: ReactNode
  endContent?: ReactNode
  avatar?: ReactNode
  className?: string
  classNames?: {
    base?: string
    content?: string
    dot?: string
    avatar?: string
    closeButton?: string
  }
  onClose?: () => void
}

export function Chip({
  children,
  size = 'md',
  color = 'default',
  variant = 'solid',
  radius = 'full',
  isDisabled = false,
  startContent,
  endContent,
  avatar,
  className,
  classNames,
  onClose,
}: IChipProps) {
  return (
    <HeroUIChip
      avatar={avatar}
      className={cn(className)}
      classNames={classNames}
      color={color}
      endContent={endContent}
      isDisabled={isDisabled}
      radius={radius}
      size={size}
      startContent={startContent}
      variant={variant}
      onClose={onClose}
    >
      {children}
    </HeroUIChip>
  )
}

export type {
  TChipSize,
  TChipColor,
  TChipVariant,
  TChipRadius,
  IChipProps,
}
