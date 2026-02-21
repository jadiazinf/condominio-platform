import type { TMemberRole } from '@packages/domain'

export type TMyManagementCompanyIconName = 'building' | 'users' | 'credit-card'

export interface IMyManagementCompanyMenuItem {
  key: string
  translationKey: string
  path: string
  iconName: TMyManagementCompanyIconName
  memberRoles?: TMemberRole[]
}

export const MY_MANAGEMENT_COMPANY_MENU_ITEMS: IMyManagementCompanyMenuItem[] = [
  {
    key: 'general',
    translationKey: 'admin.company.myCompany.sidebar.general',
    path: '',
    iconName: 'building',
  },
  {
    key: 'members',
    translationKey: 'admin.company.myCompany.sidebar.members',
    path: '/members',
    iconName: 'users',
    memberRoles: ['admin'],
  },
  {
    key: 'bank-accounts',
    translationKey: 'admin.company.myCompany.sidebar.bankAccounts',
    path: '/bank-accounts',
    iconName: 'credit-card',
  },
]

export function getMenuItemsForMemberRole(memberRole?: TMemberRole | null): IMyManagementCompanyMenuItem[] {
  return MY_MANAGEMENT_COMPANY_MENU_ITEMS.filter(item => {
    if (!item.memberRoles) return true
    if (!memberRole) return false
    return item.memberRoles.includes(memberRole)
  })
}
