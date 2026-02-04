export type TCondominiumDetailIconName = 'info' | 'building' | 'users' | 'toggle'

export interface ICondominiumDetailMenuItem {
  key: string
  translationKey: string
  path: string // relative path from /dashboard/condominiums/[id]
  iconName: TCondominiumDetailIconName
}

export const CONDOMINIUM_DETAIL_MENU_ITEMS: ICondominiumDetailMenuItem[] = [
  {
    key: 'general',
    translationKey: 'superadmin.condominiums.detail.sidebar.general',
    path: '',
    iconName: 'info',
  },
  {
    key: 'buildings',
    translationKey: 'superadmin.condominiums.detail.sidebar.buildings',
    path: '/buildings',
    iconName: 'building',
  },
  {
    key: 'users',
    translationKey: 'superadmin.condominiums.detail.sidebar.users',
    path: '/users',
    iconName: 'users',
  },
  {
    key: 'status',
    translationKey: 'superadmin.condominiums.detail.sidebar.status',
    path: '/status',
    iconName: 'toggle',
  },
]
