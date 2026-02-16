import type { Metadata } from 'next'
import { AuthPageContent } from '../components/AuthPageContent'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede a tu cuenta de CondominioApp para administrar tu condominio.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function SignInPage() {
  return <AuthPageContent initialMode="signin" />
}
