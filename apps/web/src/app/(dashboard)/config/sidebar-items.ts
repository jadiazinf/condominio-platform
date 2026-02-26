import type { LucideIcon } from 'lucide-react'
import type { TSidebarItem } from '@/ui/components/sidebar'

import {
  Settings,
  LayoutDashboard,
  Users,
  Building2,
  Building,
  DollarSign,
  Coins,
  CreditCard,
  MessageSquare,
  Receipt,
  Wallet,
  ClipboardList,
  ClipboardCheck,
  CalendarDays,
  ScrollText,
  KeyRound,
  Bell,
} from 'lucide-react'

type TSidebarItemConfig = Omit<TSidebarItem, 'icon'> & {
  icon?: LucideIcon
}

export const dashboardSidebarItems: TSidebarItemConfig[] = [
  {
    key: 'dashboard',
    title: 'nav.dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'quotas',
    title: 'admin.nav.quotas',
    icon: Receipt,
    href: '/dashboard/quotas',
  },
  {
    key: 'payments',
    title: 'admin.nav.payments',
    icon: Wallet,
    href: '/dashboard/payments',
  },
  {
    key: 'expenses',
    title: 'admin.nav.expenses',
    icon: ClipboardList,
    href: '/dashboard/expenses',
  },
  {
    key: 'amenities',
    title: 'admin.nav.amenities',
    icon: Building2,
    href: '/dashboard/amenities',
  },
  {
    key: 'join-condominium',
    title: 'resident.nav.joinCondominium',
    icon: KeyRound,
    href: '/dashboard/join-condominium',
  },
  {
    key: 'my-requests',
    title: 'resident.nav.myRequests',
    icon: ClipboardCheck,
    href: '/dashboard/my-requests',
  },
  {
    key: 'my-quotas',
    title: 'resident.nav.myQuotas',
    icon: Receipt,
    href: '/dashboard/my-quotas',
  },
  {
    key: 'my-payments',
    title: 'resident.nav.myPayments',
    icon: Wallet,
    href: '/dashboard/my-payments',
  },
  {
    key: 'report-payment',
    title: 'resident.nav.reportPayment',
    icon: CreditCard,
    href: '/dashboard/report-payment',
  },
  {
    key: 'reservations',
    title: 'resident.nav.reservations',
    icon: CalendarDays,
    href: '/dashboard/reservations',
  },
  {
    key: 'notifications',
    title: 'nav.notifications',
    icon: Bell,
    href: '/dashboard/notifications',
  },
  {
    key: 'settings',
    title: 'nav.settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
]

export const adminSidebarItems: TSidebarItemConfig[] = [
  {
    key: 'dashboard',
    title: 'admin.company.nav.dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'condominiums',
    title: 'admin.company.nav.condominiums',
    icon: Building2,
    href: '/dashboard/condominiums',
  },
  {
    key: 'my-management-company',
    title: 'admin.company.nav.myCompany',
    icon: Building,
    href: '/dashboard/my-management-company',
  },
  {
    key: 'subscription',
    title: 'admin.company.nav.subscription',
    icon: CreditCard,
    href: '/dashboard/subscription',
  },
  {
    key: 'notifications',
    title: 'nav.notifications',
    icon: Bell,
    href: '/dashboard/notifications',
  },
  {
    key: 'settings',
    title: 'nav.settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
]

export const superadminSidebarItems: TSidebarItemConfig[] = [
  {
    key: 'dashboard',
    title: 'superadmin.nav.dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'users',
    title: 'superadmin.nav.users',
    icon: Users,
    href: '/dashboard/users',
  },
  {
    key: 'condominiums',
    title: 'superadmin.nav.condominiums',
    icon: Building2,
    href: '/dashboard/condominiums',
  },
  {
    key: 'admins',
    title: 'superadmin.nav.admins',
    icon: Building,
    href: '/dashboard/admins',
  },
  {
    key: 'rates',
    title: 'superadmin.nav.rates',
    icon: DollarSign,
    href: '/dashboard/rates',
  },
  {
    key: 'currencies',
    title: 'superadmin.nav.currencies',
    icon: Coins,
    href: '/dashboard/currencies',
  },
  {
    key: 'terms-conditions',
    title: 'superadmin.nav.terms',
    icon: ScrollText,
    href: '/dashboard/terms-conditions',
  },
  {
    key: 'tickets',
    title: 'superadmin.nav.tickets',
    icon: MessageSquare,
    href: '/dashboard/tickets',
  },
  {
    key: 'notifications',
    title: 'nav.notifications',
    icon: Bell,
    href: '/dashboard/notifications',
  },
  {
    key: 'settings',
    title: 'nav.settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
]
