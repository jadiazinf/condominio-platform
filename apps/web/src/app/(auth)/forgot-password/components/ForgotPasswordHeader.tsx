'use client'

import { Link } from '@/ui/components/link'
import { KeyRound } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { AuthControls } from '@/ui/components/auth-controls'
import { BackToHomeButton } from '@/ui/components/backToHomeButton/BackToHomeButton'
import { Typography } from '@/ui/components/typography'

export function ForgotPasswordHeader() {
  const { t } = useTranslation()

  return (
    <>
      {/* Theme Switch + Language Switcher (left) and Back to Home (right) */}
      <div className="flex items-center justify-between w-full mb-6 -mt-4">
        <AuthControls />
        <BackToHomeButton />
      </div>

      {/* Logo */}
      <Link href="/">
        <Typography className="mb-8" color="primary" variant="h3">
          CondominioApp
        </Typography>
      </Link>

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-primary/10 p-4">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
      </div>

      {/* Title */}
      <div className="mb-8 text-center">
        <Typography className="mb-2" variant="h2">
          {t('auth.forgotPassword.title')}
        </Typography>
        <Typography color="muted" variant="body2">
          {t('auth.forgotPassword.subtitle')}
        </Typography>
      </div>
    </>
  )
}
