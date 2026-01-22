'use client'

import type { ReactNode, Ref } from 'react'
import { forwardRef } from 'react'

import { Badge } from '@heroui/badge'
import { Button } from '@heroui/button'
import type { BadgeProps } from '@heroui/badge'
import type { ButtonProps } from '@heroui/button'

export interface IconBadgeProps {
  /** The icon element to display */
  icon: ReactNode
  /** Badge content (number or text) */
  badgeContent?: string | number
  /** Whether to show the badge */
  showBadge?: boolean
  /** Badge color */
  badgeColor?: BadgeProps['color']
  /** Badge size */
  badgeSize?: BadgeProps['size']
  /** Badge placement */
  placement?: BadgeProps['placement']
  /** Button size */
  buttonSize?: ButtonProps['size']
  /** Button variant */
  buttonVariant?: ButtonProps['variant']
  /** Button color */
  buttonColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  /** Accessible label for the button */
  'aria-label'?: string
  /** Click handler */
  onPress?: () => void
  /** Additional button className */
  className?: string
  /** Whether the button is disabled */
  isDisabled?: boolean
}

/**
 * IconBadge - A reusable component that combines a HeroUI Button with a Badge.
 * Useful for notification bells, cart icons, and other icon buttons that need
 * to display a count or indicator.
 *
 * Supports forwardRef to work as a Popover trigger.
 */
export const IconBadge = forwardRef(function IconBadge(
  {
    icon,
    badgeContent,
    showBadge = true,
    badgeColor = 'danger',
    badgeSize = 'sm',
    placement = 'top-right',
    buttonSize = 'sm',
    buttonVariant = 'light',
    buttonColor,
    'aria-label': ariaLabel,
    onPress,
    className,
    isDisabled,
  }: IconBadgeProps,
  ref: Ref<HTMLButtonElement>
) {
  const content = typeof badgeContent === 'number' && badgeContent > 99 ? '99+' : badgeContent

  return (
    <Badge
      content={content}
      color={badgeColor}
      size={badgeSize}
      placement={placement}
      isInvisible={!showBadge || !badgeContent}
      classNames={{
        base: 'p-0',
        badge: 'border-0',
      }}
    >
      <Button
        ref={ref}
        isIconOnly
        size={buttonSize}
        variant={buttonVariant}
        color={buttonColor}
        aria-label={ariaLabel}
        onPress={onPress}
        className={className}
        isDisabled={isDisabled}
      >
        {icon}
      </Button>
    </Badge>
  )
})
