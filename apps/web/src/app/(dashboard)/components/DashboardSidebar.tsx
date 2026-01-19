'use client'

import type { LucideIcon } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

import { Sidebar, type TSidebarItem } from '@/ui/components/sidebar'
import { useTranslation } from '@/contexts'
import { dashboardSidebarItems } from '../config/sidebar-items'

type SidebarItemConfig = Omit<TSidebarItem, 'icon'> & {
  icon?: LucideIcon
}

interface DashboardSidebarProps {
  isCompact?: boolean
  onItemSelect?: () => void
}

export function DashboardSidebar({ isCompact = false, onItemSelect }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()

  // Translate sidebar items and render icons
  const translatedItems: TSidebarItem[] = (dashboardSidebarItems as SidebarItemConfig[]).map(item => {
    const IconComponent = item.icon

    return {
      ...item,
      title: t(item.title),
      icon: IconComponent ? <IconComponent size={20} /> : undefined,
    }
  })

  // Get current selected key from pathname
  const currentKey = dashboardSidebarItems.find(item => item.href && pathname.startsWith(item.href))?.key ?? 'profile'

  function handleSelect(key: string) {
    if (key === 'logout') {
      router.push('/loading?signout=true')
      onItemSelect?.()

      return
    }

    const item = dashboardSidebarItems.find(i => i.key === key)

    if (item?.href) {
      router.push(item.href)
      onItemSelect?.()
    }
  }

  return (
    <Sidebar
      defaultSelectedKey={currentKey}
      isCompact={isCompact}
      items={translatedItems}
      onSelect={handleSelect}
    />
  )
}
