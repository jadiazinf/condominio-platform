'use client'

import { Tooltip as HeroUITooltip } from '@heroui/tooltip'
import type { TooltipProps as HeroUITooltipProps } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TTooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'

type TTooltipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'foreground'

type TTooltipRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface ITooltipProps {
  content: ReactNode
  placement?: TTooltipPlacement
  color?: TTooltipColor
  radius?: TTooltipRadius
  size?: 'sm' | 'md' | 'lg'
  delay?: number
  closeDelay?: number
  offset?: number
  showArrow?: boolean
  isOpen?: boolean
  defaultOpen?: boolean
  isDisabled?: boolean
  className?: string
  classNames?: HeroUITooltipProps['classNames']
  children: ReactNode
  onOpenChange?: (isOpen: boolean) => void
}

export function Tooltip({
  content,
  placement = 'top',
  color = 'default',
  radius = 'md',
  size = 'md',
  delay = 0,
  closeDelay = 500,
  offset = 7,
  showArrow = false,
  isOpen,
  defaultOpen,
  isDisabled = false,
  className,
  classNames,
  children,
  onOpenChange,
}: ITooltipProps) {
  return (
    <HeroUITooltip
      className={cn(className)}
      classNames={classNames}
      closeDelay={closeDelay}
      color={color}
      content={content}
      defaultOpen={defaultOpen}
      delay={delay}
      isDisabled={isDisabled}
      isOpen={isOpen}
      offset={offset}
      placement={placement}
      radius={radius}
      showArrow={showArrow}
      size={size}
      onOpenChange={onOpenChange}
    >
      {children}
    </HeroUITooltip>
  )
}

export type { TTooltipPlacement, TTooltipColor, TTooltipRadius, ITooltipProps }
