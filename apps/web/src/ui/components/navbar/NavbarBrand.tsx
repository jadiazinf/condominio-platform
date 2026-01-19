'use client'

import { NavbarBrand as HeroUINavbarBrand } from '@heroui/navbar'
import Link from 'next/link'

export function NavbarBrand() {
  return (
    <HeroUINavbarBrand>
      <Link className="font-bold text-inherit text-xl" href="/">
        CondominioApp
      </Link>
    </HeroUINavbarBrand>
  )
}
