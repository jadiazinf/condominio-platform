'use client'

import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/navbar'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Menu } from 'lucide-react'

import { useUser } from '@/contexts'
import { NotificationPanel } from '@/ui/components/notifications'
import { UserAvatar } from '@/ui/components/avatar'

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

      <NavbarContent className="items-center gap-2" justify="end">
        <NavbarItem className="flex">
          <NotificationPanel />
        </NavbarItem>
        <NavbarItem className="flex ml-2">
          <UserAvatar
            href="/dashboard/settings"
            name={user?.displayName || user?.firstName || user?.email}
            src={user?.photoUrl}
          />
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  )
}
