'use client'

import { NavbarContent, NavbarMenuToggle } from '@heroui/navbar'

import { NavbarBrand } from './NavbarBrand'
import { useTranslation } from '@/contexts'

interface NavbarMenuToggleSectionProps {
  isMenuOpen: boolean
}

export function NavbarMenuToggleSection({ isMenuOpen }: NavbarMenuToggleSectionProps) {
  const { t } = useTranslation()

  return (
    <NavbarContent>
      <NavbarMenuToggle
        aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
        className="md:hidden"
      />
      <NavbarBrand />
    </NavbarContent>
  )
}
