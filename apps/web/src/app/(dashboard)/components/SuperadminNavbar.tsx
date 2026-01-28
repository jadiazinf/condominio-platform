'use client'

import type { TUser } from '@packages/domain'

import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/navbar'
import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'
import { Chip } from '@/ui/components/chip'
import { Menu, Shield } from 'lucide-react'

import { NotificationPanel } from '@/ui/components/notifications'
import { CurrentUserAvatar } from '@/ui/components/avatar'

interface SuperadminNavbarProps {
  onToggleSidebar?: () => void
  /** Initial user data from server to prevent avatar flash */
  initialUser?: TUser | null
}

export function SuperadminNavbar({ onToggleSidebar, initialUser }: SuperadminNavbarProps) {
  return (
    <HeroUINavbar isBordered classNames={{ wrapper: 'px-4' }} maxWidth="full">
      <NavbarContent justify="start">
        {onToggleSidebar && (
          <Button isIconOnly variant="light" onPress={onToggleSidebar}>
            <Menu size={24} />
          </Button>
        )}
        <NavbarBrand className="gap-3">
          <Link className="font-bold text-inherit text-xl" href="/dashboard">
            CondominioApp
          </Link>
          <Chip
            classNames={{ base: 'bg-danger/10', content: 'text-danger font-semibold text-xs' }}
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
          <CurrentUserAvatar initialUser={initialUser} isClickable />
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  )
}
