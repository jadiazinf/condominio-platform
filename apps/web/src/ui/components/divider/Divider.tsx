'use client'

import { Divider as HeroUIDivider } from '@heroui/divider'
import { cn } from '@heroui/theme'

type TDividerOrientation = 'horizontal' | 'vertical'

interface IDividerProps {
  orientation?: TDividerOrientation
  className?: string
}

export function Divider({
  orientation = 'horizontal',
  className,
}: IDividerProps) {
  return (
    <HeroUIDivider
      className={cn(className)}
      orientation={orientation}
    />
  )
}

export type {
  TDividerOrientation,
  IDividerProps,
}
