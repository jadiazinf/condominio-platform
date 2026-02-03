'use client'

import { useTranslation } from '@/contexts'
import { COMPANY_DETAIL_MENU_ITEMS } from '../config/sidebar-items'
import { CompanyDetailSidebarLink } from './CompanyDetailSidebarLink'

interface CompanySidebarProps {
  companyId: string
}

export function CompanySidebar({ companyId }: CompanySidebarProps) {
  const { t } = useTranslation()
  const basePath = `/dashboard/admins/${companyId}`

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {COMPANY_DETAIL_MENU_ITEMS.map(item => (
          <CompanyDetailSidebarLink
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
