import type { Metadata } from 'next'

import { ForgotPasswordForm } from './components/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Recuperar Contraseña',
  description: 'Recupera el acceso a tu cuenta de CondominioApp.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <ForgotPasswordForm />
    </div>
  )
}
