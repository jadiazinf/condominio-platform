'use client'

import { Navbar as NavbarPrimitive } from '@heroui/navbar'
import type { NavbarProps } from '@heroui/navbar'
import { cn } from '@heroui/theme'

export function HeroUINavbar({ classNames, ...props }: NavbarProps) {
  return (
    <NavbarPrimitive
      classNames={{
        ...classNames,
        base: cn('bg-background', classNames?.base),
      }}
      {...props}
    />
  )
}
