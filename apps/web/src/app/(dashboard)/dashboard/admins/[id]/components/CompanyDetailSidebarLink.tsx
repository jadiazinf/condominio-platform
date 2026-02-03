'use client'

import { Link } from '@/ui/components/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/ui/utils'
import { Building2, Home, Users, CreditCard, Receipt, Headset, ToggleLeft } from 'lucide-react'

import type { TCompanyDetailIconName } from '../config/sidebar-items'

const ICONS = {
  general: Building2,
  condominiums: Home,
  members: Users,
  subscription: CreditCard,
  invoices: Receipt,
  tickets: Headset,
  toggle: ToggleLeft,
} as const

interface ICompanyDetailSidebarLinkProps {
  href: string
  basePath: string
  iconName: TCompanyDetailIconName
  label: string
}

export function CompanyDetailSidebarLink({
  href,
  basePath,
  iconName,
  label,
}: ICompanyDetailSidebarLinkProps) {
  const pathname = usePathname()
  const isActive = checkIfActive(pathname, href, basePath)
  const Icon = ICONS[iconName]

  return (
    <Link
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        'text-default-600 hover:text-foreground hover:bg-default-100',
        isActive && 'bg-default-100 text-foreground font-medium border-2 border-primary'
      )}
      href={href}
    >
      <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
      <span className="text-sm">{label}</span>
    </Link>
  )
}

function checkIfActive(currentPath: string, linkPath: string, basePath: string): boolean {
  // For the root company detail page, only match exactly
  if (linkPath === basePath) {
    return currentPath === basePath
  }

  // For other pages, match if path starts with link path
  return currentPath.startsWith(linkPath)
}
