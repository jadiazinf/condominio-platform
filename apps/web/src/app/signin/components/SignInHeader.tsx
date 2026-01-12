import { Link } from '@heroui/link'

import { BackToHomeButton } from '@/ui/components/backToHomeButton'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { Typography } from '@/ui/components/typography'

export function SignInHeader() {
  return (
    <>
      {/* Back to Home Button and Theme Switch */}
      <div className="flex items-center gap-2 mb-2">
        <BackToHomeButton />
        <ThemeSwitch />
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
          Inicia sesión en tu cuenta
        </Typography>
        <Typography color="muted" variant="body2">
          Inicia sesión en tu cuenta para que puedas continuar gestionando tu condominio.
        </Typography>
      </div>
    </>
  )
}
