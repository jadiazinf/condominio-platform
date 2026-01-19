'use client'

import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/navbar'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Menu } from 'lucide-react'

import { useUser } from '@/contexts'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { LanguageSwitcher } from '@/ui/components/language-switcher'

interface DashboardNavbarProps {
  onToggleSidebar?: () => void
}

export function DashboardNavbar({ onToggleSidebar }: DashboardNavbarProps) {
  const { user } = useUser()

  return (
    <HeroUINavbar isBordered classNames={{ wrapper: 'px-4' }} maxWidth="full">
      <NavbarContent justify="start">
        {onToggleSidebar && (
          <Button isIconOnly size="sm" variant="light" onPress={onToggleSidebar}>
            <Menu size={24} />
          </Button>
        )}
        <NavbarBrand>
          <Link className="font-bold text-inherit text-xl" href="/dashboard">
            CondominioApp
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <LanguageSwitcher variant="icon" />
        </NavbarItem>
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem>
          <span className="text-sm text-foreground/70">
            {user?.displayName || user?.firstName || user?.email}
          </span>
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  )
}
