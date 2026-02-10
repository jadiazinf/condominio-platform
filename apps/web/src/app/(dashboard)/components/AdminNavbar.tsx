'use client'

import type { TUser } from '@packages/domain'

import { HeroUINavbar, NavbarBrandPrimitive, NavbarContent, NavbarItem } from '@/ui/components/navbar'
import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'
import { Chip } from '@/ui/components/chip'
import { Menu, Building } from 'lucide-react'

import { NotificationPanel } from '@/ui/components/notifications'
import { CurrentUserAvatar } from '@/ui/components/avatar'
import { SwitchRoleButton } from './SwitchRoleButton'
import { useManagementCompany } from '@/contexts'

interface AdminNavbarProps {
  onToggleSidebar?: () => void
  initialUser?: TUser | null
}

export function AdminNavbar({ onToggleSidebar, initialUser }: AdminNavbarProps) {
  const { managementCompanies } = useManagementCompany()
  const companyName = managementCompanies[0]?.managementCompanyName ?? 'Admin'

  return (
    <HeroUINavbar isBordered classNames={{ wrapper: 'px-4' }} maxWidth="full">
      <NavbarContent justify="start">
        {onToggleSidebar && (
          <Button isIconOnly variant="light" onPress={onToggleSidebar}>
            <Menu size={24} />
          </Button>
        )}
        <NavbarBrandPrimitive className="gap-3">
          <Link className="font-bold text-inherit text-xl" href="/dashboard">
            CondominioApp
          </Link>
          <Chip
            classNames={{ base: 'bg-primary/10', content: 'text-primary font-semibold text-xs max-w-[150px] truncate' }}
            startContent={<Building size={12} />}
            variant="flat"
          >
            {companyName}
          </Chip>
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
