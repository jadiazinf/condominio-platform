'use client'

import { Link } from '@/ui/components/link'
import { usePathname } from 'next/navigation'
import { cn } from '@heroui/theme'
import { Building2, Home, Users, CreditCard, Receipt, Headset } from 'lucide-react'

interface CompanySidebarProps {
  companyId: string
}

const SIDEBAR_ITEMS = [
  {
    key: 'general',
    href: (id: string) => `/dashboard/admins/${id}`,
    icon: Building2,
    label: 'General',
  },
  {
    key: 'condominiums',
    href: (id: string) => `/dashboard/admins/${id}/condominiums`,
    icon: Home,
    label: 'Condominios',
  },
  {
    key: 'members',
    href: (id: string) => `/dashboard/admins/${id}/members`,
    icon: Users,
    label: 'Miembros',
  },
  {
    key: 'subscription',
    href: (id: string) => `/dashboard/admins/${id}/subscription`,
    icon: CreditCard,
    label: 'Suscripción',
  },
  {
    key: 'invoices',
    href: (id: string) => `/dashboard/admins/${id}/invoices`,
    icon: Receipt,
    label: 'Historial de Pagos',
  },
  {
    key: 'tickets',
    href: (id: string) => `/dashboard/admins/${id}/tickets`,
    icon: Headset,
    label: 'Tickets de Soporte',
  },
] as const

export function CompanySidebar({ companyId }: CompanySidebarProps) {
  const pathname = usePathname()

  const checkIfActive = (linkPath: string): boolean => {
    // For the root company page (general), only match exactly
    if (linkPath === `/dashboard/admins/${companyId}`) {
      return pathname === `/dashboard/admins/${companyId}`
    }

    // For other pages, match if path starts with link path
    return pathname.startsWith(linkPath)
  }

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map(item => {
          const href = item.href(companyId)
          const isActive = checkIfActive(href)
          const Icon = item.icon

          return (
            <Link
              key={item.key}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'text-default-600 hover:text-foreground hover:bg-default-100',
                isActive && 'bg-default-100 text-foreground font-medium border-2 border-primary'
              )}
              href={href}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
