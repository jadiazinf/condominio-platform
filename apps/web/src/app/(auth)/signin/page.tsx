import type { Metadata } from 'next'

import { SignInForm } from './components/SignInForm'
import { SignUpCTA } from './components/SignUpCTA'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede a tu cuenta de CondominioApp para administrar tu condominio.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center">
      {/* Sign In Form - White background on mobile */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background lg:bg-transparent">
        <SignInForm />
      </div>

      {/* Sign Up CTA - Primary background on mobile */}
      <div className="flex-1 flex items-center justify-center p-8 lg:pl-16 lg:pr-8">
        <SignUpCTA />
      </div>
    </div>
  )
}
