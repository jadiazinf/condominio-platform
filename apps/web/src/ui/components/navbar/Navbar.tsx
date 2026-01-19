'use client'

import { Navbar as HeroUINavbar } from '@heroui/navbar'
import { useState } from 'react'

import { NavbarMenuToggleSection } from './NavbarMenuToggleSection'
import { NavbarLinks } from './NavbarLinks'
import { NavbarActions } from './NavbarActions'
import { NavbarMobileMenu } from './NavbarMobileMenu'

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <HeroUINavbar maxWidth="xl" position="sticky" onMenuOpenChange={setIsMenuOpen}>
      <NavbarMenuToggleSection isMenuOpen={isMenuOpen} />
      <NavbarLinks />
      <NavbarActions />
      <NavbarMobileMenu />
    </HeroUINavbar>
  )
}
