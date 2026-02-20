'use client'

import { Link } from '@/ui/components/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/ui/utils'
import { Info, Building2, Users, ToggleLeft, Receipt, CreditCard, FileText, UserPlus } from 'lucide-react'

import type { TCondominiumDetailIconName } from '../config/sidebar-items'

const ICONS = {
  info: Info,
  building: Building2,
  users: Users,
  toggle: ToggleLeft,
  receipt: Receipt,
  'credit-card': CreditCard,
  'file-text': FileText,
  'user-plus': UserPlus,
} as const

interface ICondominiumDetailSidebarLinkProps {
  href: string
  basePath: string
  iconName: TCondominiumDetailIconName
  label: string
}

export function CondominiumDetailSidebarLink({
  href,
  basePath,
  iconName,
  label,
}: ICondominiumDetailSidebarLinkProps) {
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
  // For the root condominium detail page, only match exactly
  if (linkPath === basePath) {
    return currentPath === basePath
  }

  // For other pages, match if path starts with link path
  return currentPath.startsWith(linkPath)
}
