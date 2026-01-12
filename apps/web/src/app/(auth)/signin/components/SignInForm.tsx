'use client'

import { TSignInSchema } from '../schemas/types'

import { SignInFormFields } from './SignInFormFields'
import { SignInHeader } from './SignInHeader'

export function SignInForm() {
  function handleSubmit(data: TSignInSchema) {
    // TODO: Implement sign in logic
    console.log(data)
  }

  function handleGoogleSignIn() {
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
