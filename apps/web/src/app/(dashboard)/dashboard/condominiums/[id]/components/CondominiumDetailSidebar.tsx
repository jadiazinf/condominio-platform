'use client'

import type { TActiveRoleType } from '@packages/domain'

import { useMemo } from 'react'

import { getMenuItemsForRole } from '../config/sidebar-items'

import { CondominiumDetailSidebarLink } from './CondominiumDetailSidebarLink'

import { useTranslation } from '@/contexts'

interface ICondominiumDetailSidebarProps {
  condominiumId: string
  userRole?: TActiveRoleType | null
}

export function CondominiumDetailSidebar({
  condominiumId,
  userRole,
}: ICondominiumDetailSidebarProps) {
  const { t } = useTranslation()
  const basePath = `/dashboard/condominiums/${condominiumId}`
  const menuItems = useMemo(() => getMenuItemsForRole(userRole), [userRole])

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {menuItems.map(item => (
          <CondominiumDetailSidebarLink
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
