'use client'

import { NavbarMenu, NavbarMenuItem } from '@heroui/navbar'
import { Link } from '@/ui/components/link'

import { NAV_ITEMS } from './NavbarLinks'
import { useTranslation } from '@/contexts'

interface NavbarMobileMenuProps {
  isAuthenticated?: boolean
}

export function NavbarMobileMenu({ isAuthenticated = false }: NavbarMobileMenuProps) {
  const { t } = useTranslation()

  return (
    <NavbarMenu>
      {NAV_ITEMS.map(function (item) {
        return (
          <NavbarMenuItem key={item.href}>
            <Link className="w-full" color="foreground" href={item.href} size="lg">
              {t(item.labelKey)}
            </Link>
          </NavbarMenuItem>
        )
      })}
      {isAuthenticated ? (
        <NavbarMenuItem>
          <Link className="w-full" color="primary" href="/dashboard" size="lg">
            {t('nav.dashboard')}
          </Link>
        </NavbarMenuItem>
      ) : (
        <>
          <NavbarMenuItem>
            <Link className="w-full" color="foreground" href="/signin" size="lg">
              {t('nav.signIn')}
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link className="w-full" color="primary" href="/signup" size="lg">
              {t('nav.signUp')}
            </Link>
          </NavbarMenuItem>
        </>
      )}
    </NavbarMenu>
  )
}
