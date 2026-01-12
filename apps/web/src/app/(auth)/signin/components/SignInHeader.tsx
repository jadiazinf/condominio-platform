import { Link } from '@heroui/link'

import { BackToHome } from '@/ui/components/backToHomeButton/BackToHome'
import { ThemeSwitch } from '@/ui/components/themeSwitch/ThemeSwitch'
import { Typography } from '@/ui/components/typography'

export function SignInHeader() {
  return (
    <>
      {/* Theme Switch (left) and Back to Home (right) */}
      <div className="flex items-center justify-between w-full mb-6 -mt-4">
        <ThemeSwitch />
        <BackToHome />
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
