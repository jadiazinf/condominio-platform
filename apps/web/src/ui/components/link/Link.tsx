'use client'

import NextLink from 'next/link'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TLinkSize = 'sm' | 'md' | 'lg'
type TLinkColor = 'foreground' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
type TLinkUnderline = 'none' | 'hover' | 'always' | 'active' | 'focus'

const SIZE_CLASSES: Record<TLinkSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

const COLOR_CLASSES: Record<TLinkColor, string> = {
  foreground: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

const UNDERLINE_CLASSES: Record<TLinkUnderline, string> = {
  none: 'no-underline',
  hover: 'hover:underline',
  always: 'underline',
  active: 'active:underline',
  focus: 'focus:underline',
}

interface ILinkProps {
  href?: string
  size?: TLinkSize
  color?: TLinkColor
  underline?: TLinkUnderline
  isExternal?: boolean
  isBlock?: boolean
  isDisabled?: boolean
  showAnchorIcon?: boolean
  anchorIcon?: ReactNode
  className?: string
  children?: ReactNode
  onClick?: () => void
}

export function Link({
  href,
  size = 'md',
  color = 'primary',
  underline = 'none',
  isExternal = false,
  isBlock = false,
  isDisabled = false,
  className,
  children,
  onClick,
}: ILinkProps) {
  const classes = cn(
    SIZE_CLASSES[size],
    COLOR_CLASSES[color],
    UNDERLINE_CLASSES[underline],
    isBlock && 'block',
    isDisabled && 'pointer-events-none opacity-50',
    className,
  )

  if (!href) {
    return <span className={classes}>{children}</span>
  }

  return (
    <NextLink
      className={classes}
      href={href}
      onClick={onClick}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </NextLink>
  )
}

export type { TLinkSize, TLinkColor, TLinkUnderline, ILinkProps }
