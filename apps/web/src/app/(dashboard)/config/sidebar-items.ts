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
  Wallet,
  ScrollText,
  KeyRound,
  Bell,
  ShieldAlert,
  AlertTriangle,
  Calculator,
  FileSpreadsheet,
  Scale,
  Activity,
  Landmark,
  BookOpen,
  ListChecks,
  CalendarCheck,
  Receipt,
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
    key: 'my-statement',
    title: 'resident.nav.myStatement',
    icon: BookOpen,
    href: '/dashboard/my-statement',
  },
  {
    key: 'my-billing-charges',
    title: 'resident.nav.myBillingCharges',
    icon: ListChecks,
    href: '/dashboard/my-billing-charges',
  },
  {
    key: 'my-payments',
    title: 'resident.nav.myPayments',
    icon: Wallet,
    href: '/dashboard/my-payments',
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
    key: 'payments',
    title: 'admin.company.nav.payments',
    icon: Wallet,
    href: '/dashboard/payments',
  },
  {
    key: 'bank-reconciliation',
    title: 'admin.company.nav.bankReconciliation',
    icon: Scale,
    href: '/dashboard/bank-reconciliation',
  },
  {
    key: 'delinquency-report',
    title: 'admin.company.nav.delinquencyReport',
    icon: AlertTriangle,
    href: '/dashboard/reports/delinquency',
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
    key: 'event-logs',
    title: 'admin.company.nav.eventLogs',
    icon: Activity,
    href: '/dashboard/event-logs',
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
