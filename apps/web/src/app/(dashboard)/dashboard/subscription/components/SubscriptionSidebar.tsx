'use client'

import { useTranslation } from '@/contexts'
import { SUBSCRIPTION_MENU_ITEMS } from '../config/sidebar-items'
import { SubscriptionSidebarLink } from './SubscriptionSidebarLink'

export function SubscriptionSidebar() {
  const { t } = useTranslation()
  const basePath = '/dashboard/subscription'

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {SUBSCRIPTION_MENU_ITEMS.map(item => (
          <SubscriptionSidebarLink
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
