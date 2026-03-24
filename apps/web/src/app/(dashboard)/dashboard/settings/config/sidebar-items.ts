export type TSettingsIconName = 'user' | 'globe' | 'palette' | 'bell'

export interface ISettingsMenuItem {
  key: string
  translationKey: string
  href: string
  iconName: TSettingsIconName
}

export const SETTINGS_MENU_ITEMS: ISettingsMenuItem[] = [
  {
    key: 'profile',
    translationKey: 'settings.nav.profile',
    href: '/dashboard/settings',
    iconName: 'user',
  },
  {
    key: 'notifications',
    translationKey: 'settings.nav.notifications',
    href: '/dashboard/settings/notifications',
    iconName: 'bell',
  },
  {
    key: 'language',
    translationKey: 'settings.nav.language',
    href: '/dashboard/settings/language',
    iconName: 'globe',
  },
  {
    key: 'appearance',
    translationKey: 'settings.nav.appearance',
    href: '/dashboard/settings/appearance',
    iconName: 'palette',
  },
]
