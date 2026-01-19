'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type TSignInSchema } from '@packages/domain'

import { SignInFormFields } from './SignInFormFields'
import { SignInHeader } from './SignInHeader'

import { useAuth, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

export function SignInForm() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useTranslation()
  const { signInWithEmail, signInWithGoogle, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: TSignInSchema) {
    try {
      setIsSubmitting(true)
      await signInWithEmail(data.email, data.password)
      toast.success(t('auth.signIn.success'))
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.signIn.error')

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      toast.success(t('auth.signIn.googleSuccess'))
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.signIn.googleError')

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <SignInHeader />
      <SignInFormFields
        isLoading={loading || isSubmitting}
        onGoogleSignIn={handleGoogleSignIn}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
