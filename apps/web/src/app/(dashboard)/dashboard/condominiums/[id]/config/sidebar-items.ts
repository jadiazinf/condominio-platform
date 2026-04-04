import type { TActiveRoleType } from '@packages/domain'

export type TCondominiumDetailIconName =
  | 'info'
  | 'building'
  | 'users'
  | 'toggle'
  | 'receipt'
  | 'credit-card'
  | 'file-text'
  | 'file-spreadsheet'
  | 'scroll-text'
  | 'user-plus'
  | 'wrench'
  | 'piggy-bank'
  | 'shield'
  | 'tag'
  | 'calculator'
  | 'dollar-sign'

export interface ICondominiumDetailMenuItem {
  key: string
  translationKey: string
  path: string // relative path from /dashboard/condominiums/[id]
  iconName: TCondominiumDetailIconName
  roles?: TActiveRoleType[] // if undefined, visible to all roles
}

export const CONDOMINIUM_DETAIL_MENU_ITEMS: ICondominiumDetailMenuItem[] = [
  // Always first
  {
    key: 'general',
    translationKey: 'superadmin.condominiums.detail.sidebar.general',
    path: '',
    iconName: 'info',
  },
  // Alphabetical (Spanish): Actas, Cobros, Conceptos, Edificios, Fondo de Reserva, Junta, Pagos, Presupuestos, Recibos, Servicios, Solicitudes, Usuarios
  {
    key: 'assembly-minutes',
    translationKey: 'admin.condominiums.detail.sidebar.assemblyMinutes',
    path: '/assembly-minutes',
    iconName: 'scroll-text',
    roles: ['management_company'],
  },
  {
    key: 'charges',
    translationKey: 'admin.condominiums.detail.sidebar.charges',
    path: '/charges',
    iconName: 'dollar-sign',
    roles: ['management_company'],
  },
  {
    key: 'charge-types',
    translationKey: 'admin.condominiums.detail.sidebar.chargeTypes',
    path: '/charge-types',
    iconName: 'tag',
    roles: ['management_company'],
  },
  {
    key: 'buildings',
    translationKey: 'superadmin.condominiums.detail.sidebar.buildings',
    path: '/buildings',
    iconName: 'building',
  },
  {
    key: 'reserve-fund',
    translationKey: 'admin.condominiums.detail.sidebar.reserveFund',
    path: '/reserve-fund',
    iconName: 'piggy-bank',
    roles: ['management_company'],
  },
  {
    key: 'board',
    translationKey: 'admin.condominiums.detail.sidebar.board',
    path: '/board',
    iconName: 'shield',
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
    key: 'budgets',
    translationKey: 'admin.condominiums.detail.sidebar.budgets',
    path: '/budgets',
    iconName: 'calculator',
    roles: ['management_company'],
  },
  {
    key: 'receipts',
    translationKey: 'admin.condominiums.detail.sidebar.receipts',
    path: '/receipts',
    iconName: 'file-spreadsheet',
    roles: ['management_company'],
  },
  {
    key: 'services',
    translationKey: 'admin.condominiums.detail.sidebar.services',
    path: '/services',
    iconName: 'wrench',
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
