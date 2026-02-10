'use client'

import { Navbar as HeroUINavbar } from '@heroui/navbar'
import { useState } from 'react'

import { NavbarMenuToggleSection } from './NavbarMenuToggleSection'
import { NavbarLinks } from './NavbarLinks'
import { NavbarActions } from './NavbarActions'
import { NavbarMobileMenu } from './NavbarMobileMenu'

interface NavbarProps {
  isAuthenticated?: boolean
  showNavLinks?: boolean
}

export function Navbar({ isAuthenticated = false, showNavLinks = true }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <HeroUINavbar
      maxWidth="xl"
      position="sticky"
      onMenuOpenChange={setIsMenuOpen}
      isBordered={false}
    >
      <NavbarMenuToggleSection isMenuOpen={isMenuOpen} />
      {showNavLinks && <NavbarLinks />}
      <NavbarActions isAuthenticated={isAuthenticated} />
      <NavbarMobileMenu isAuthenticated={isAuthenticated} />
    </HeroUINavbar>
  )
}
