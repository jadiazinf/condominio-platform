'use client'

import { SignInFormFields, SignInFormData } from './SignInFormFields'
import { SignInHeader } from './SignInHeader'

export function SignInForm() {
  const handleSubmit = (data: SignInFormData) => {
    // TODO: Implement sign in logic
    console.log(data)
  }

  const handleGoogleSignIn = () => {
    // TODO: Implement Google sign in
    console.log('Google sign in')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <SignInHeader />
      <SignInFormFields onGoogleSignIn={handleGoogleSignIn} onSubmit={handleSubmit} />
    </div>
  )
}

