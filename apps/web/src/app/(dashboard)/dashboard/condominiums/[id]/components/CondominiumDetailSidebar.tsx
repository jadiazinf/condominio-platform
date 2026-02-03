'use client'

import { useTranslation } from '@/contexts'
import { CONDOMINIUM_DETAIL_MENU_ITEMS } from '../config/sidebar-items'
import { CondominiumDetailSidebarLink } from './CondominiumDetailSidebarLink'

interface ICondominiumDetailSidebarProps {
  condominiumId: string
}

export function CondominiumDetailSidebar({ condominiumId }: ICondominiumDetailSidebarProps) {
  const { t } = useTranslation()
  const basePath = `/dashboard/condominiums/${condominiumId}`

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {CONDOMINIUM_DETAIL_MENU_ITEMS.map(item => (
          <CondominiumDetailSidebarLink
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
