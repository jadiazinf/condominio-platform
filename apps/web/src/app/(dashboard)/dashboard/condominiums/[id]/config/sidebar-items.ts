import type { TActiveRoleType } from '@packages/domain'

export type TCondominiumDetailIconName =
  | 'info'
  | 'building'
  | 'users'
  | 'toggle'
  | 'receipt'
  | 'credit-card'
  | 'file-text'
  | 'user-plus'

export interface ICondominiumDetailMenuItem {
  key: string
  translationKey: string
  path: string // relative path from /dashboard/condominiums/[id]
  iconName: TCondominiumDetailIconName
  roles?: TActiveRoleType[] // if undefined, visible to all roles
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
    key: 'quotas',
    translationKey: 'admin.condominiums.detail.sidebar.quotas',
    path: '/quotas',
    iconName: 'receipt',
    roles: ['management_company'],
  },
  {
    key: 'payments',
    translationKey: 'admin.condominiums.detail.sidebar.payments',
    path: '/payments',
    iconName: 'credit-card',
    roles: ['management_company'],
  },
  {
    key: 'payment-concepts',
    translationKey: 'admin.condominiums.detail.sidebar.paymentConcepts',
    path: '/payment-concepts',
    iconName: 'file-text',
    roles: ['management_company'],
  },
  {
    key: 'access-requests',
    translationKey: 'admin.condominiums.detail.sidebar.accessRequests',
    path: '/access-requests',
    iconName: 'user-plus',
    roles: ['management_company'],
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
    roles: ['superadmin'],
  },
]

export function getMenuItemsForRole(role?: TActiveRoleType | null): ICondominiumDetailMenuItem[] {
  return CONDOMINIUM_DETAIL_MENU_ITEMS.filter(item => {
    if (!item.roles) return true
    if (!role) return false
    return item.roles.includes(role)
  })
}
