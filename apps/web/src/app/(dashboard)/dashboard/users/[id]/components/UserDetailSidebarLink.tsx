'use client'

import { Link } from '@/ui/components/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/ui/utils'
import { User, Building2, Shield, ToggleLeft } from 'lucide-react'

import type { TUserDetailIconName } from '../config/sidebar-items'

const ICONS = {
  user: User,
  building: Building2,
  shield: Shield,
  toggle: ToggleLeft,
} as const

interface IUserDetailSidebarLinkProps {
  href: string
  basePath: string
  iconName: TUserDetailIconName
  label: string
}

export function UserDetailSidebarLink({
  href,
  basePath,
  iconName,
  label,
}: IUserDetailSidebarLinkProps) {
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
  // For the root user detail page, only match exactly
  if (linkPath === basePath) {
    return currentPath === basePath
  }

  // For other pages, match if path starts with link path
  return currentPath.startsWith(linkPath)
}
