'use client'

import {
  Popover as HeroUIPopover,
  PopoverTrigger as HeroUIPopoverTrigger,
  PopoverContent as HeroUIPopoverContent,
} from '@heroui/popover'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TPopoverPlacement =
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

type TPopoverColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'foreground'

type TPopoverRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TPopoverBackdrop = 'transparent' | 'opaque' | 'blur'

interface IPopoverProps {
  placement?: TPopoverPlacement
  color?: TPopoverColor
  radius?: TPopoverRadius
  size?: 'sm' | 'md' | 'lg'
  backdrop?: TPopoverBackdrop
  offset?: number
  showArrow?: boolean
  isOpen?: boolean
  defaultOpen?: boolean
  shouldCloseOnBlur?: boolean
  shouldBlockScroll?: boolean
  shouldCloseOnInteractOutside?: (element: Element) => boolean
  className?: string
  children: ReactNode[]
  onOpenChange?: (isOpen: boolean) => void
  onClose?: () => void
}

export function Popover({
  placement = 'bottom',
  color = 'default',
  radius = 'lg',
  size = 'md',
  backdrop = 'transparent',
  offset = 7,
  showArrow = false,
  isOpen,
  defaultOpen,
  shouldCloseOnBlur = true,
  shouldBlockScroll = false,
  shouldCloseOnInteractOutside,
  className,
  children,
  onOpenChange,
  onClose,
}: IPopoverProps) {
  return (
    <HeroUIPopover
      backdrop={backdrop}
      className={cn(className)}
      color={color}
      defaultOpen={defaultOpen}
      isOpen={isOpen}
      offset={offset}
      placement={placement}
      radius={radius}
      shouldBlockScroll={shouldBlockScroll}
      shouldCloseOnBlur={shouldCloseOnBlur}
      shouldCloseOnInteractOutside={shouldCloseOnInteractOutside}
      showArrow={showArrow}
      size={size}
      onClose={onClose}
      onOpenChange={onOpenChange}
    >
      {children}
    </HeroUIPopover>
  )
}

interface IPopoverTriggerProps {
  children: ReactNode
}

export function PopoverTrigger({ children }: IPopoverTriggerProps) {
  return <HeroUIPopoverTrigger>{children}</HeroUIPopoverTrigger>
}

interface IPopoverContentProps {
  className?: string
  children: ReactNode
}

export function PopoverContent({ className, children }: IPopoverContentProps) {
  return (
    <HeroUIPopoverContent className={cn(className)}>
      {children}
    </HeroUIPopoverContent>
  )
}

export type {
  TPopoverPlacement,
  TPopoverColor,
  TPopoverRadius,
  TPopoverBackdrop,
  IPopoverProps,
  IPopoverTriggerProps,
  IPopoverContentProps,
}
