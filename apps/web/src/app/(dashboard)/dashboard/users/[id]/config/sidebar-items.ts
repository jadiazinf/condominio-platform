export type TUserDetailIconName = 'user' | 'building' | 'shield' | 'toggle'

export interface IUserDetailMenuItem {
  key: string
  translationKey: string
  path: string // relative path from /dashboard/users/[id]
  iconName: TUserDetailIconName
  superadminOnly?: boolean
  regularUserOnly?: boolean
}

export const USER_DETAIL_MENU_ITEMS: IUserDetailMenuItem[] = [
  {
    key: 'general',
    translationKey: 'superadmin.users.detail.nav.general',
    path: '',
    iconName: 'user',
  },
  {
    key: 'condominiums',
    translationKey: 'superadmin.users.detail.nav.condominiums',
    path: '/condominiums',
    iconName: 'building',
    regularUserOnly: true,
  },
  {
    key: 'permissions',
    translationKey: 'superadmin.users.detail.nav.permissions',
    path: '/permissions',
    iconName: 'shield',
    superadminOnly: true,
  },
  {
    key: 'status',
    translationKey: 'superadmin.users.detail.nav.status',
    path: '/status',
    iconName: 'toggle',
  },
]
