'use client'

import { Link as HeroUILink } from '@heroui/link'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TLinkSize = 'sm' | 'md' | 'lg'

type TLinkColor = 'foreground' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TLinkUnderline = 'none' | 'hover' | 'always' | 'active' | 'focus'

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
  showAnchorIcon = false,
  anchorIcon,
  className,
  children,
  onClick,
}: ILinkProps) {
  return (
    <HeroUILink
      anchorIcon={anchorIcon}
      className={cn(className)}
      color={color}
      href={href}
      isBlock={isBlock}
      isDisabled={isDisabled}
      isExternal={isExternal}
      showAnchorIcon={showAnchorIcon}
      size={size}
      underline={underline}
      onClick={onClick}
    >
      {children}
    </HeroUILink>
  )
}

export type { TLinkSize, TLinkColor, TLinkUnderline, ILinkProps }
