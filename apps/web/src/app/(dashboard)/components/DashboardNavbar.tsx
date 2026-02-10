'use client'

import type { TUser } from '@packages/domain'

import {
  HeroUINavbar,
  NavbarBrandPrimitive,
  NavbarContent,
  NavbarItem,
} from '@/ui/components/navbar'
import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'
import { Menu } from 'lucide-react'

import { NotificationPanel } from '@/ui/components/notifications'
import { CurrentUserAvatar } from '@/ui/components/avatar'
import { SwitchRoleButton } from './SwitchRoleButton'

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
          <Button isIconOnly variant="light" onPress={onToggleSidebar}>
            <Menu size={24} />
          </Button>
        )}
        <NavbarBrandPrimitive>
          <Link className="font-bold text-inherit text-xl" href="/dashboard">
            CondominioApp
          </Link>
        </NavbarBrandPrimitive>
      </NavbarContent>

      <NavbarContent className="items-center gap-2" justify="end">
        <NavbarItem className="flex">
          <SwitchRoleButton />
        </NavbarItem>
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
