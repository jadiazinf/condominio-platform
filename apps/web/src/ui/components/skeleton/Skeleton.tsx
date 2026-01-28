'use client'

import { Skeleton as HeroUISkeleton } from '@heroui/skeleton'
import { cn } from '@heroui/theme'

interface ISkeletonProps {
  isLoaded?: boolean
  disableAnimation?: boolean
  className?: string
  children?: React.ReactNode
}

export function Skeleton({
  isLoaded = false,
  disableAnimation = false,
  className,
  children,
}: ISkeletonProps) {
  return (
    <HeroUISkeleton
      className={cn(className)}
      disableAnimation={disableAnimation}
      isLoaded={isLoaded}
    >
      {children}
    </HeroUISkeleton>
  )
}

export type { ISkeletonProps }
