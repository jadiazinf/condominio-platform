'use client'

import type {
  NavbarProps,
  NavbarBrandProps,
  NavbarContentProps,
  NavbarItemProps,
} from '@heroui/navbar'

import {
  Navbar as NavbarBase,
  NavbarBrand as NavbarBrandBase,
  NavbarContent as NavbarContentBase,
  NavbarItem as NavbarItemBase,
} from '@heroui/navbar'

export function HeroUINavbar(props: NavbarProps) {
  return <NavbarBase {...props} />
}

export function NavbarBrand(props: NavbarBrandProps) {
  return <NavbarBrandBase {...props} />
}

export function NavbarContent(props: NavbarContentProps) {
  return <NavbarContentBase {...props} />
}

export function NavbarItem(props: NavbarItemProps) {
  return <NavbarItemBase {...props} />
}
