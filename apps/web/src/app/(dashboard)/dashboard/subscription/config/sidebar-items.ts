export type TSubscriptionIconName = 'creditCard' | 'history'

export interface ISubscriptionMenuItem {
  key: string
  translationKey: string
  path: string
  iconName: TSubscriptionIconName
}

export const SUBSCRIPTION_MENU_ITEMS: ISubscriptionMenuItem[] = [
  {
    key: 'subscription',
    translationKey: 'admin.subscription.sidebar.subscription',
    path: '',
    iconName: 'creditCard',
  },
  {
    key: 'history',
    translationKey: 'admin.subscription.sidebar.history',
    path: '/history',
    iconName: 'history',
  },
]
