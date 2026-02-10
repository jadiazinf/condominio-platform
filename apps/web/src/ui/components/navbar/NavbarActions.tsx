'use client'

import { NavbarContent, NavbarItem } from '@heroui/navbar'
import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'

import { useTranslation } from '@/contexts'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { LanguageSwitcher } from '@/ui/components/language-switcher'

interface NavbarActionsProps {
  isAuthenticated?: boolean
}

export function NavbarActions({ isAuthenticated = false }: NavbarActionsProps) {
  const { t } = useTranslation()

  return (
    <NavbarContent className="items-center gap-2" justify="end">
      <NavbarItem className="flex">
        <LanguageSwitcher variant="icon" />
      </NavbarItem>
      <NavbarItem className="flex">
        <ThemeSwitch />
      </NavbarItem>
      {isAuthenticated ? (
        <NavbarItem className="hidden md:flex ml-2">
          <Button as={Link} color="primary" href="/dashboard" variant="flat">
            {t('nav.dashboard')}
          </Button>
        </NavbarItem>
      ) : (
        <>
          <NavbarItem className="hidden md:flex ml-2">
            <Link href="/signin">{t('nav.signIn')}</Link>
          </NavbarItem>
          <NavbarItem className="hidden md:flex">
            <Button as={Link} color="primary" href="/signup" variant="flat">
              {t('nav.signUp')}
            </Button>
          </NavbarItem>
        </>
      )}
    </NavbarContent>
  )
}
