import { getTranslations } from '@/libs/i18n/server'

import { SETTINGS_MENU_ITEMS } from '../config/sidebar-items'
import { SidebarLink } from './SidebarLink'

export async function SettingsSidebar() {
  const { t } = await getTranslations()

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {SETTINGS_MENU_ITEMS.map(item => (
          <SidebarLink
            key={item.key}
            href={item.href}
            iconName={item.iconName}
            label={t(item.translationKey)}
          />
        ))}
      </nav>
    </aside>
  )
}
