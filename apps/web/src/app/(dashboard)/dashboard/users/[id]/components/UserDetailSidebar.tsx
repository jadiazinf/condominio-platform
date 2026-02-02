'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/contexts'

import { USER_DETAIL_MENU_ITEMS } from '../config/sidebar-items'
import { UserDetailSidebarLink } from './UserDetailSidebarLink'

interface IUserDetailSidebarProps {
  userId: string
  isSuperadmin: boolean
}

export function UserDetailSidebar({ userId, isSuperadmin }: IUserDetailSidebarProps) {
  const { t } = useTranslation()
  const basePath = `/dashboard/users/${userId}`

  const filteredItems = useMemo(() => {
    return USER_DETAIL_MENU_ITEMS.filter(item => {
      // If item is superadmin only and user is not superadmin, hide it
      if (item.superadminOnly && !isSuperadmin) return false
      // If item is regular user only and user is superadmin, hide it
      if (item.regularUserOnly && isSuperadmin) return false
      return true
    })
  }, [isSuperadmin])

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {filteredItems.map(item => (
          <UserDetailSidebarLink
            key={item.key}
            href={`${basePath}${item.path}`}
            basePath={basePath}
            iconName={item.iconName}
            label={t(item.translationKey)}
          />
        ))}
      </nav>
    </aside>
  )
}
