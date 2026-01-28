'use client'

import { Avatar as HeroUIAvatar } from '@heroui/avatar'
import type { AvatarProps as HeroUIAvatarProps } from '@heroui/avatar'
import { cn } from '@heroui/theme'

type TAvatarSize = 'sm' | 'md' | 'lg'

type TAvatarRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TAvatarColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

interface IAvatarProps {
  src?: string
  name?: string
  alt?: string
  size?: TAvatarSize
  radius?: TAvatarRadius
  color?: TAvatarColor
  isBordered?: boolean
  isDisabled?: boolean
  isFocusable?: boolean
  showFallback?: boolean
  fallback?: React.ReactNode
  className?: string
  classNames?: HeroUIAvatarProps['classNames']
  imgProps?: HeroUIAvatarProps['imgProps']
}

export function Avatar({
  src,
  name,
  alt,
  size = 'md',
  radius = 'full',
  color = 'default',
  isBordered = false,
  isDisabled = false,
  isFocusable = false,
  showFallback = true,
  fallback,
  className,
  classNames,
  imgProps,
}: IAvatarProps) {
  return (
    <HeroUIAvatar
      alt={alt}
      className={cn(className)}
      classNames={classNames}
      color={color}
      fallback={fallback}
      imgProps={imgProps}
      isBordered={isBordered}
      isDisabled={isDisabled}
      isFocusable={isFocusable}
      name={name}
      radius={radius}
      showFallback={showFallback}
      size={size}
      src={src}
    />
  )
}

export type { TAvatarSize, TAvatarRadius, TAvatarColor, IAvatarProps }
