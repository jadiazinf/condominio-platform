'use client'

import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/navbar'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Chip } from '@heroui/chip'
import { Menu, Shield } from 'lucide-react'

import { useUser } from '@/contexts'
import { NotificationPanel } from '@/ui/components/notifications'
import { UserAvatar } from '@/ui/components/avatar'

interface SuperadminNavbarProps {
  onToggleSidebar?: () => void
}

export function SuperadminNavbar({ onToggleSidebar }: SuperadminNavbarProps) {
  const { user } = useUser()

  return (
    <HeroUINavbar isBordered classNames={{ wrapper: 'px-4' }} maxWidth="full">
      <NavbarContent justify="start">
        {onToggleSidebar && (
          <Button isIconOnly size="sm" variant="light" onPress={onToggleSidebar}>
            <Menu size={24} />
          </Button>
        )}
        <NavbarBrand className="gap-3">
          <Link className="font-bold text-inherit text-xl" href="/dashboard">
            CondominioApp
          </Link>
          <Chip
            classNames={{ base: 'bg-danger/10', content: 'text-danger font-semibold text-xs' }}
            size="sm"
            startContent={<Shield size={12} />}
            variant="flat"
          >
            Superadmin
          </Chip>
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
