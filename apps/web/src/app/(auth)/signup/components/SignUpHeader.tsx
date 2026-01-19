'use client'

import { Link } from '@heroui/link'

import { useTranslation } from '@/contexts'
import { BackToHomeButton } from '@/ui/components/backToHomeButton/BackToHomeButton'
import { LanguageSwitcher } from '@/ui/components/language-switcher'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { Typography } from '@/ui/components/typography'

export function SignUpHeader() {
  const { t } = useTranslation()

  return (
    <>
      {/* Theme Switch + Language Switcher (left) and Back to Home (right) */}
      <div className="flex items-center justify-between w-full mb-6 -mt-4">
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <LanguageSwitcher variant="icon" />
        </div>
        <BackToHomeButton />
      </div>

      {/* Logo */}
      <Link href="/">
        <Typography className="mb-8" color="primary" variant="h3">
          CondominioApp
        </Typography>
      </Link>

      {/* Title */}
      <div className="mb-8">
        <Typography className="mb-2" variant="h2">
          {t('auth.signUp.title')}
        </Typography>
        <Typography color="muted" variant="body2">
          {t('auth.signUp.subtitle')}
        </Typography>
      </div>
    </>
  )
}
