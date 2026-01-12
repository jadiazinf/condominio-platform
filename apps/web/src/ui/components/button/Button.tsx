'use client'

import { Button as HeroUIButton } from '@heroui/button'
import { Link } from '@heroui/link'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TButtonColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TButtonSize = 'sm' | 'md' | 'lg'

type TButtonVariant = 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost'

type TButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TSpinnerPlacement = 'start' | 'end'

interface IButtonProps {
  children?: ReactNode
  color?: TButtonColor
  size?: TButtonSize
  variant?: TButtonVariant
  radius?: TButtonRadius
  isDisabled?: boolean
  isLoading?: boolean
  isIconOnly?: boolean
  fullWidth?: boolean
  startContent?: ReactNode
  endContent?: ReactNode
  spinner?: ReactNode
  spinnerPlacement?: TSpinnerPlacement
  disableRipple?: boolean
  disableAnimation?: boolean
  className?: string
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  onPress?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  color = 'default',
  size = 'md',
  variant = 'solid',
  radius = 'md',
  isDisabled = false,
  isLoading = false,
  isIconOnly = false,
  fullWidth = false,
  startContent,
  endContent,
  spinner,
  spinnerPlacement = 'start',
  disableRipple = false,
  disableAnimation = false,
  className,
  href,
  target,
  onPress,
  type = 'button',
}: IButtonProps) {
  const buttonProps = {
    color,
    size,
    variant,
    radius,
    isDisabled,
    isLoading,
    isIconOnly,
    fullWidth,
    startContent,
    endContent,
    spinner,
    spinnerPlacement,
    disableRipple,
    disableAnimation,
    className: cn(className),
    onPress,
    type,
  }

  if (href) {
    return (
      <HeroUIButton as={Link} href={href} target={target} {...buttonProps}>
        {children}
      </HeroUIButton>
    )
  }

  return <HeroUIButton {...buttonProps}>{children}</HeroUIButton>
}

// Export types for external use
export type { TButtonColor, TButtonSize, TButtonVariant, TButtonRadius, IButtonProps }
