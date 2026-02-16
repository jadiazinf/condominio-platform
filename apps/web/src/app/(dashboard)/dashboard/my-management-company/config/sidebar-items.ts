import type { TMemberRole } from '@packages/domain'

export type TMyManagementCompanyIconName = 'building' | 'users'

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
]

export function getMenuItemsForMemberRole(memberRole?: TMemberRole | null): IMyManagementCompanyMenuItem[] {
  return MY_MANAGEMENT_COMPANY_MENU_ITEMS.filter(item => {
    if (!item.memberRoles) return true
    if (!memberRole) return false
    return item.memberRoles.includes(memberRole)
  })
}
