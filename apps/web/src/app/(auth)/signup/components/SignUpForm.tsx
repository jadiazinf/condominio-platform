'use client'

import { TSignUpSchema } from '../schemas/types'

import { SignUpFormFields } from './SignUpFormFields'
import { SignUpHeader } from './SignUpHeader'

export function SignUpForm() {
  function handleSubmit(data: TSignUpSchema) {
    // TODO: Implement sign up logic
    console.log(data)
  }

  function handleGoogleSignUp() {
    // TODO: Implement Google sign up
    console.log('Google sign up')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <SignUpHeader />
      <SignUpFormFields onGoogleSignUp={handleGoogleSignUp} onSubmit={handleSubmit} />
    </div>
  )
}
