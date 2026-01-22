'use client'

import { Link } from '@heroui/link'
import { usePathname } from 'next/navigation'
import { cn } from '@heroui/theme'
import { User, Globe, Palette } from 'lucide-react'

import type { TSettingsIconName } from '../config/sidebar-items'

const ICONS = {
  user: User,
  globe: Globe,
  palette: Palette,
} as const

interface ISidebarLinkProps {
  href: string
  iconName: TSettingsIconName
  label: string
}

export function SidebarLink({ href, iconName, label }: ISidebarLinkProps) {
  const pathname = usePathname()
  const isActive = checkIfActive(pathname, href)
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

function checkIfActive(currentPath: string, linkPath: string): boolean {
  // For the root settings page, only match exactly
  if (linkPath === '/dashboard/settings') {
    return currentPath === '/dashboard/settings'
  }

  // For other pages, match if path starts with link path
  return currentPath.startsWith(linkPath)
}
