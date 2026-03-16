'use client'

import Link from 'next/link'
import { LogIn } from 'lucide-react'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-16">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            className="text-sm font-semibold tracking-widest uppercase text-foreground/90 hover:text-foreground transition-colors"
            href="/"
          >
            CondominioApp
          </Link>

          {/* Right side: actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher variant="icon" />
            <ThemeSwitch />

            {/* Icon button on mobile, full button on sm+ */}
            <Link
              className="hidden sm:inline-block text-xs font-medium tracking-widest uppercase px-6 py-2 border border-foreground/20 text-foreground/90 hover:bg-foreground/5 hover:border-brick/40 transition-all ml-2"
              href={isAuthenticated ? '/dashboard' : '/auth'}
            >
              {isAuthenticated ? t('nav.dashboard') : t('nav.getStarted')}
            </Link>
            <Link
              aria-label={isAuthenticated ? t('nav.dashboard') : t('nav.getStarted')}
              className="sm:hidden flex items-center justify-center w-9 h-9 border border-foreground/20 text-foreground/90 hover:bg-foreground/5 transition-all"
              href={isAuthenticated ? '/dashboard' : '/auth'}
            >
              <LogIn size={16} />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
