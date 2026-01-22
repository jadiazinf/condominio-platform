'use client'

import { useRouter, usePathname } from 'next/navigation'

import { Sidebar, type TSidebarItem } from '@/ui/components/sidebar'
import { useTranslation } from '@/contexts'
import { superadminSidebarItems } from '../config/sidebar-items'

interface SuperadminSidebarProps {
  isCompact?: boolean
  onItemSelect?: () => void
}

export function SuperadminSidebar({ isCompact = false, onItemSelect }: SuperadminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()

  const translatedItems: TSidebarItem[] = superadminSidebarItems.map(item => {
    const IconComponent = item.icon

    return {
      ...item,
      title: t(item.title),
      icon: IconComponent ? <IconComponent size={20} /> : undefined,
    }
  })

  function getCurrentKey(): string {
    if (pathname === '/dashboard') {
      return 'dashboard'
    }

    const item = superadminSidebarItems.find(
      item => item.href && item.href !== '/dashboard' && pathname.startsWith(item.href)
    )

    return item?.key ?? 'dashboard'
  }

  function handleSelect(key: string) {
    if (key === 'logout') {
      router.push('/loading?signout=true')
      onItemSelect?.()

      return
    }

    const item = superadminSidebarItems.find(i => i.key === key)

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
