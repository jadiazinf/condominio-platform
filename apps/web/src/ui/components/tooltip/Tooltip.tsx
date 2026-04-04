'use client'

import type { TooltipProps as HeroUITooltipProps } from '@heroui/tooltip'

import { Tooltip as HeroUITooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { ReactNode, useState, useCallback, useRef, useEffect } from 'react'

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

type TTooltipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'foreground'

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
  isOpen: controlledIsOpen,
  defaultOpen,
  isDisabled = false,
  className,
  classNames,
  children,
  onOpenChange,
}: ITooltipProps) {
  // Internal state for touch-based toggling (uncontrolled mode only)
  const [touchOpen, setTouchOpen] = useState(false)
  const isControlled = controlledIsOpen !== undefined
  const touchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Close tooltip on outside tap (for touch mode)
  useEffect(() => {
    if (!touchOpen) return

    const handleOutsideTouch = () => {
      setTouchOpen(false)
    }

    // Delay adding listener to avoid immediately closing
    const id = setTimeout(() => {
      document.addEventListener('touchstart', handleOutsideTouch, { once: true })
    }, 10)

    return () => {
      clearTimeout(id)
      document.removeEventListener('touchstart', handleOutsideTouch)
    }
  }, [touchOpen])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    }
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isControlled || isDisabled) return
      e.stopPropagation()
      setTouchOpen(prev => !prev)
    },
    [isControlled, isDisabled]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isControlled || isDisabled) return
      e.stopPropagation()
      setTouchOpen(prev => !prev)
    },
    [isControlled, isDisabled]
  )

  const resolvedIsOpen = isControlled ? controlledIsOpen : touchOpen || undefined
  const resolvedOnOpenChange = isControlled
    ? onOpenChange
    : (open: boolean) => {
        setTouchOpen(open)
        onOpenChange?.(open)
      }

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
      isOpen={resolvedIsOpen}
      offset={offset}
      placement={placement}
      radius={radius}
      showArrow={showArrow}
      size={size}
      onOpenChange={resolvedOnOpenChange}
    >
      <span onClick={handleClick} onTouchStart={handleTouchStart}>{children}</span>
    </HeroUITooltip>
  )
}

export type { TTooltipPlacement, TTooltipColor, TTooltipRadius, ITooltipProps }
