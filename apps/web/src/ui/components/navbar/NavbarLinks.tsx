'use client'

import { NavbarContent, NavbarItem } from '@heroui/navbar'
import { Link } from '@/ui/components/link'

import { useTranslation } from '@/contexts'

const NAV_ITEMS = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.benefits', href: '#beneficios' },
  { labelKey: 'nav.howItWorks', href: '#como-funciona' },
  { labelKey: 'nav.join', href: '#pricing' },
]

export function NavbarLinks() {
  const { t } = useTranslation()

  return (
    <NavbarContent className="hidden md:flex gap-4" justify="center">
      {NAV_ITEMS.map(function (item) {
        return (
          <NavbarItem key={item.href}>
            <Link color="foreground" href={item.href}>
              {t(item.labelKey)}
            </Link>
          </NavbarItem>
        )
      })}
    </NavbarContent>
  )
}

export { NAV_ITEMS }
