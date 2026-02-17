'use client'

import { Button as HeroUIButton } from '@heroui/button'
import { Link } from '@heroui/link'
import { cn } from '@heroui/theme'
import { forwardRef, ElementType, ReactNode, ComponentPropsWithoutRef } from 'react'

type TButtonColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TButtonSize = 'sm' | 'md' | 'lg'

type TButtonVariant = 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost' | 'text'

type TButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TSpinnerPlacement = 'start' | 'end'

interface IButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'color' | 'value'> {
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
  as?: ElementType
}

export const Button = forwardRef<HTMLButtonElement, IButtonProps>(function Button(
  {
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
    as,
    ...rest
  },
  ref
) {
  // "text" variant: renders as a plain inline button styled like text
  if (variant === 'text') {
    const colorClass = color === 'primary' ? 'text-primary'
      : color === 'danger' ? 'text-danger'
      : color === 'success' ? 'text-success'
      : color === 'warning' ? 'text-warning'
      : color === 'secondary' ? 'text-secondary'
      : 'text-current'

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn('inline underline cursor-pointer hover:opacity-80', colorClass, className)}
        onClick={rest.onClick ?? (onPress ? () => onPress() : undefined)}
      >
        {children}
      </button>
    )
  }

  const buttonProps = {
    ref,
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
    className: cn(className, 'cursor-pointer'),
    onPress,
    type,
    ...rest,
  }

  // If 'as' prop is provided, use it directly (with type assertion for polymorphic compatibility)
  if (as) {
    return (
      <HeroUIButton as={as} href={href} target={target} {...(buttonProps as any)}>
        {children}
      </HeroUIButton>
    )
  }

  // If href is provided, render as Link (with type assertion for polymorphic compatibility)
  if (href) {
    return (
      <HeroUIButton as={Link} href={href} target={target} {...(buttonProps as any)}>
        {children}
      </HeroUIButton>
    )
  }

  return <HeroUIButton {...(buttonProps as any)}>{children}</HeroUIButton>
})

// Export types for external use
export type { TButtonColor, TButtonSize, TButtonVariant, TButtonRadius, IButtonProps }
