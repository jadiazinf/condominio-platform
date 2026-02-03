export type TCompanyDetailIconName = 'general' | 'condominiums' | 'members' | 'subscription' | 'invoices' | 'tickets' | 'toggle'

export interface ICompanyDetailMenuItem {
  key: string
  translationKey: string
  path: string
  iconName: TCompanyDetailIconName
}

export const COMPANY_DETAIL_MENU_ITEMS: ICompanyDetailMenuItem[] = [
  {
    key: 'general',
    translationKey: 'superadmin.companies.detail.tabs.general',
    path: '',
    iconName: 'general',
  },
  {
    key: 'condominiums',
    translationKey: 'superadmin.companies.detail.tabs.condominiums',
    path: '/condominiums',
    iconName: 'condominiums',
  },
  {
    key: 'members',
    translationKey: 'superadmin.companies.detail.tabs.members',
    path: '/members',
    iconName: 'members',
  },
  {
    key: 'subscription',
    translationKey: 'superadmin.companies.detail.tabs.subscription',
    path: '/subscription',
    iconName: 'subscription',
  },
  {
    key: 'invoices',
    translationKey: 'superadmin.companies.detail.tabs.invoices',
    path: '/invoices',
    iconName: 'invoices',
  },
  {
    key: 'tickets',
    translationKey: 'superadmin.companies.detail.tabs.tickets',
    path: '/tickets',
    iconName: 'tickets',
  },
  {
    key: 'status',
    translationKey: 'superadmin.companies.detail.tabs.status',
    path: '/actions',
    iconName: 'toggle',
  },
]
