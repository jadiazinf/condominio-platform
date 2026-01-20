import type { LucideIcon } from 'lucide-react'
import { User, Settings, LogOut } from 'lucide-react'

import type { TSidebarItem } from '@/ui/components/sidebar'

type TSidebarItemConfig = Omit<TSidebarItem, 'icon'> & {
  icon?: LucideIcon
}

export const dashboardSidebarItems: TSidebarItemConfig[] = [
  {
    key: 'profile',
    title: 'nav.profile',
    icon: User,
    href: '/dashboard/profile',
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
