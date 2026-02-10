'use client'

import Link from 'next/link'
import { useTranslation } from '@/contexts'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { LanguageSwitcher } from '@/ui/components/language-switcher'

interface LandingNavbarProps {
  isAuthenticated?: boolean
}

export function LandingNavbar({ isAuthenticated = false }: LandingNavbarProps) {
  const { t } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 ">
      <div className="max-w-7xl mx-auto px-8 md:px-16">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-sm font-semibold tracking-widest uppercase text-foreground/90 hover:text-foreground transition-colors"
          >
            CondominioApp
          </Link>

          {/* Right side: actions */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="icon" />
            <ThemeSwitch />

            <Link
              href={isAuthenticated ? '/dashboard' : '/signin'}
              className="text-xs font-medium tracking-widest uppercase px-6 py-2 border border-foreground/20 text-foreground/90 hover:bg-foreground/5 hover:border-brick/40 transition-all ml-2"
            >
              {isAuthenticated ? t('nav.dashboard') : t('nav.getStarted')}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
