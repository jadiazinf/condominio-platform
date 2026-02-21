'use client'

import { Link } from '@/ui/components/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/ui/utils'
import { Building, CreditCard, Users } from 'lucide-react'

import type { TMyManagementCompanyIconName } from '../config/sidebar-items'

const ICONS = {
  building: Building,
  'credit-card': CreditCard,
  users: Users,
} as const

interface IMyManagementCompanySidebarLinkProps {
  href: string
  basePath: string
  iconName: TMyManagementCompanyIconName
  label: string
}

export function MyManagementCompanySidebarLink({
  href,
  basePath,
  iconName,
  label,
}: IMyManagementCompanySidebarLinkProps) {
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
  if (linkPath === basePath) {
    return currentPath === basePath
  }
  return currentPath.startsWith(linkPath)
}
