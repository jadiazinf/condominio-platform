import type { Metadata } from 'next'

import { SignInCTA } from './components/SignInCTA'
import { SignUpForm } from './components/SignUpForm'

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
  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center">
      {/* Sign Up Form - White background on mobile */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background lg:bg-transparent">
        <SignUpForm />
      </div>

      {/* Sign In CTA - Primary background on mobile */}
      <div className="flex-1 flex items-center justify-center p-8 lg:pl-16 lg:pr-8">
        <SignInCTA />
      </div>
    </div>
  )
}
