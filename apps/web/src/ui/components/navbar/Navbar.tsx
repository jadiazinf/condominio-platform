'use client'

import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from '@heroui/navbar'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { useState } from 'react'

import { useTranslation } from '@/contexts'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { LanguageSwitcher } from '@/ui/components/language-switcher'

const navItems = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.benefits', href: '#beneficios' },
  { labelKey: 'nav.howItWorks', href: '#como-funciona' },
  { labelKey: 'nav.join', href: '#pricing' },
]

const navMenuItems = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.benefits', href: '#beneficios' },
  { labelKey: 'nav.howItWorks', href: '#como-funciona' },
  { labelKey: 'nav.join', href: '#pricing' },
  { labelKey: 'nav.signIn', href: '/signin' },
  { labelKey: 'nav.signUp', href: '/signup' },
]

export const Navbar = () => {
  const { t } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <HeroUINavbar maxWidth="xl" position="sticky" onMenuOpenChange={setIsMenuOpen}>
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          className="md:hidden"
        />
        <NavbarBrand>
          <p className="font-bold text-inherit text-xl">CondominioApp</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden md:flex gap-4" justify="center">
        {navItems.map(item => (
          <NavbarItem key={item.href}>
            <Link color="foreground" href={item.href}>
              {t(item.labelKey)}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <LanguageSwitcher variant="icon" />
        </NavbarItem>
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <Link href="/signin">{t('nav.signIn')}</Link>
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <Button as={Link} color="primary" href="/signup" variant="flat">
            {t('nav.signUp')}
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {navMenuItems.map(item => (
          <NavbarMenuItem key={item.href}>
            <Link className="w-full" color="foreground" href={item.href} size="lg">
              {t(item.labelKey)}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </HeroUINavbar>
  )
}
