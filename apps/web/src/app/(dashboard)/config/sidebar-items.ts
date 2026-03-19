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
  ArrowLeftRight,
  ShieldAlert,
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
    key: 'amenities',
    title: 'admin.nav.amenities',
    icon: Building2,
    href: '/dashboard/amenities',
  },
  {
    key: 'quotas',
    title: 'admin.nav.quotas',
    icon: Receipt,
    href: '/dashboard/quotas',
  },
  {
    key: 'expenses',
    title: 'admin.nav.expenses',
    icon: ClipboardList,
    href: '/dashboard/expenses',
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
    key: 'my-requests',
    title: 'resident.nav.myRequests',
    icon: ClipboardCheck,
    href: '/dashboard/my-requests',
  },
  {
    key: 'payments',
    title: 'admin.nav.payments',
    icon: Wallet,
    href: '/dashboard/payments',
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
    key: 'join-condominium',
    title: 'resident.nav.joinCondominium',
    icon: KeyRound,
    href: '/dashboard/join-condominium',
  },
  {
    key: 'support',
    title: 'resident.nav.support',
    icon: MessageSquare,
    href: '/dashboard/support',
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
    key: 'pending-allocations',
    title: 'admin.company.nav.pendingAllocations',
    icon: ArrowLeftRight,
    href: '/dashboard/payments/pending-allocations',
  },
  {
    key: 'condominiums',
    title: 'admin.company.nav.condominiums',
    icon: Building2,
    href: '/dashboard/condominiums',
  },
  {
    key: 'quotas',
    title: 'admin.company.nav.quotas',
    icon: Receipt,
    href: '/dashboard/quotas',
  },
  {
    key: 'my-management-company',
    title: 'admin.company.nav.myCompany',
    icon: Building,
    href: '/dashboard/my-management-company',
  },
  {
    key: 'payments',
    title: 'admin.company.nav.payments',
    icon: Wallet,
    href: '/dashboard/payments',
  },
  {
    key: 'subscription',
    title: 'admin.company.nav.subscription',
    icon: CreditCard,
    href: '/dashboard/subscription',
  },
  {
    key: 'tickets',
    title: 'admin.company.nav.tickets',
    icon: MessageSquare,
    href: '/dashboard/support',
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
    key: 'no-subscription',
    title: 'superadmin.nav.noSubscription',
    icon: ShieldAlert,
    href: '/dashboard/admins/no-subscription',
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
