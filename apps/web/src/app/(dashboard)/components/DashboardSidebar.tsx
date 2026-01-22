'use client'

import { useRouter, usePathname } from 'next/navigation'

import { dashboardSidebarItems } from '../config/sidebar-items'

import { Sidebar, type TSidebarItem } from '@/ui/components/sidebar'
import { useTranslation } from '@/contexts'

interface DashboardSidebarProps {
  isCompact?: boolean
  onItemSelect?: () => void
}

export function DashboardSidebar({ isCompact = false, onItemSelect }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()

  // Translate sidebar items and render icons
  const translatedItems: TSidebarItem[] = dashboardSidebarItems.map(item => {
    const IconComponent = item.icon

    return {
      ...item,
      title: t(item.title),
      icon: IconComponent ? <IconComponent size={20} /> : undefined,
    }
  })

  // Get current selected key from pathname
  // Sort by href length descending to match more specific paths first
  const currentKey =
    [...dashboardSidebarItems]
      .filter(item => item.href)
      .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
      .find(item => item.href && pathname.startsWith(item.href))?.key ?? 'dashboard'

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
