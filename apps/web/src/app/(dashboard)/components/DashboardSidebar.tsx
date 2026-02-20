'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { dashboardSidebarItems } from '../config/sidebar-items'

import { Sidebar, type TSidebarItem } from '@/ui/components/sidebar'
import { useTranslation, useCondominium } from '@/contexts'

const NO_CONDOMINIUM_KEYS = new Set(['dashboard', 'join-condominium', 'my-requests', 'settings'])

interface DashboardSidebarProps {
  isCompact?: boolean
  onItemSelect?: () => void
}

export function DashboardSidebar({ isCompact = false, onItemSelect }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()
  const { condominiums } = useCondominium()

  const hasCondominiums = condominiums.length > 0

  // Filter items based on whether user has condominiums
  const visibleItems = useMemo(
    () =>
      hasCondominiums
        ? dashboardSidebarItems
        : dashboardSidebarItems.filter(item => NO_CONDOMINIUM_KEYS.has(item.key)),
    [hasCondominiums]
  )

  // Translate sidebar items and render icons
  const translatedItems: TSidebarItem[] = visibleItems.map(item => {
    const IconComponent = item.icon

    return {
      ...item,
      title: t(item.title),
      icon: IconComponent ? <IconComponent size={18} /> : undefined,
    }
  })

  // Get current selected key from pathname
  // Sort by href length descending to match more specific paths first
  const currentKey =
    [...visibleItems]
      .filter(item => item.href)
      .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
      .find(item => item.href && pathname.startsWith(item.href))?.key ?? 'dashboard'

  function handleSelect(key: string) {
    const item = visibleItems.find(i => i.key === key)

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
