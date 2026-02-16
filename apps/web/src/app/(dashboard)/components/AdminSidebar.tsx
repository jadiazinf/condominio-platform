'use client'

import { useRouter, usePathname } from 'next/navigation'

import { Sidebar, type TSidebarItem } from '@/ui/components/sidebar'
import { useTranslation } from '@/contexts'
import { adminSidebarItems } from '../config/sidebar-items'

interface AdminSidebarProps {
  isCompact?: boolean
  onItemSelect?: () => void
}

export function AdminSidebar({ isCompact = false, onItemSelect }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()

  const translatedItems: TSidebarItem[] = adminSidebarItems.map(item => {
    const IconComponent = item.icon

    return {
      ...item,
      title: t(item.title),
      icon: IconComponent ? <IconComponent size={18} /> : undefined,
    }
  })

  function getCurrentKey(): string {
    if (pathname === '/dashboard') {
      return 'dashboard'
    }

    const item = adminSidebarItems.find(
      item => item.href && item.href !== '/dashboard' && pathname.startsWith(item.href)
    )

    return item?.key ?? 'dashboard'
  }

  function handleSelect(key: string) {
    const item = adminSidebarItems.find(i => i.key === key)

    if (item?.href) {
      router.push(item.href)
      onItemSelect?.()
    }
  }

  return (
    <Sidebar
      defaultSelectedKey={getCurrentKey()}
      isCompact={isCompact}
      items={translatedItems}
      onSelect={handleSelect}
    />
  )
}
