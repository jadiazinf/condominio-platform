import { User, Settings, LogOut } from 'lucide-react'

import type { TSidebarItem } from '@/ui/components/sidebar'

export const dashboardSidebarItems: TSidebarItem[] = [
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
