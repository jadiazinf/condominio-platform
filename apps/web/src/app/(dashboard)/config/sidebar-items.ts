import type { LucideIcon } from 'lucide-react'
import type { TSidebarItem } from '@/ui/components/sidebar'

import {
  Settings,
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  Building,
  Shield,
  CreditCard,
} from 'lucide-react'

type TSidebarItemConfig = Omit<TSidebarItem, 'icon'> & {
  icon?: LucideIcon
}

export const dashboardSidebarItems: TSidebarItemConfig[] = [
  {
    key: 'dashboard',
    title: 'nav.dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'settings',
    title: 'nav.settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
  {
    key: 'logout',
    title: 'nav.logout',
    icon: LogOut,
  },
]

export const superadminSidebarItems: TSidebarItemConfig[] = [
  {
    key: 'dashboard',
    title: 'superadmin.nav.dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'users',
    title: 'superadmin.nav.users',
    icon: Users,
    href: '/dashboard/users',
  },
  {
    key: 'condominiums',
    title: 'superadmin.nav.condominiums',
    icon: Building2,
    href: '/dashboard/condominiums',
  },
  {
    key: 'administradoras',
    title: 'superadmin.nav.administradoras',
    icon: Building,
    href: '/dashboard/administradoras',
  },
  {
    key: 'permissions',
    title: 'superadmin.nav.permissions',
    icon: Shield,
    href: '/dashboard/permissions',
  },
  {
    key: 'billing',
    title: 'superadmin.nav.billing',
    icon: CreditCard,
    href: '/dashboard/billing',
  },
  {
    key: 'settings',
    title: 'nav.settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
]
