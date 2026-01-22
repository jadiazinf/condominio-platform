'use client'

import type { TUser } from '@packages/domain'

import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/navbar'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Menu } from 'lucide-react'

import { NotificationPanel } from '@/ui/components/notifications'
import { CurrentUserAvatar } from '@/ui/components/avatar'

interface DashboardNavbarProps {
  onToggleSidebar?: () => void
  /** Initial user data from server to prevent avatar flash */
  initialUser?: TUser | null
}

export function DashboardNavbar({ onToggleSidebar, initialUser }: DashboardNavbarProps) {
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

      <NavbarContent className="items-center gap-2" justify="end">
        <NavbarItem className="flex">
          <NotificationPanel />
        </NavbarItem>
        <NavbarItem className="flex ml-2">
          <CurrentUserAvatar initialUser={initialUser} isClickable />
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  )
}
