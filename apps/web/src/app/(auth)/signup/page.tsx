import type { Metadata } from 'next'
import { AuthPageContent } from '../components/AuthPageContent'

export const metadata: Metadata = {
  title: 'Crear Cuenta',
  description:
    'Regístrate en CondominioApp y comienza a administrar tu condominio de forma fácil y eficiente.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignUpPage() {
  return <AuthPageContent initialMode="signup" />
}
