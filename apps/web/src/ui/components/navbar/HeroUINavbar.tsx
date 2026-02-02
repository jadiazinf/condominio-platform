'use client'

import { Navbar as NavbarPrimitive } from '@heroui/navbar'
import type { NavbarProps } from '@heroui/navbar'

export function HeroUINavbar(props: NavbarProps) {
  return <NavbarPrimitive {...props} />
}
