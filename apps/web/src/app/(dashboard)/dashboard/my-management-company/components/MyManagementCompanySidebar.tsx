'use client'

import type { TMemberRole } from '@packages/domain'

import { useMemo } from 'react'

import { getMenuItemsForMemberRole } from '../config/sidebar-items'

import { MyManagementCompanySidebarLink } from './MyManagementCompanySidebarLink'

import { useTranslation } from '@/contexts'

interface IMyManagementCompanySidebarProps {
  memberRole?: TMemberRole | null
}

export function MyManagementCompanySidebar({ memberRole }: IMyManagementCompanySidebarProps) {
  const { t } = useTranslation()
  const basePath = '/dashboard/my-management-company'
  const menuItems = useMemo(() => getMenuItemsForMemberRole(memberRole), [memberRole])

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {menuItems.map(item => (
          <MyManagementCompanySidebarLink
            key={item.key}
            basePath={basePath}
            href={`${basePath}${item.path}`}
            iconName={item.iconName}
            label={t(item.translationKey)}
          />
        ))}
      </nav>
    </aside>
  )
}
