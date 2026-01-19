'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type TSignUpSchema } from '@packages/domain'

import { SignUpFormFields } from './SignUpFormFields'
import { SignUpHeader } from './SignUpHeader'

import { useAuth, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

export function SignUpForm() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useTranslation()
  const { signUpWithEmail, signInWithGoogle, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: TSignUpSchema) {
    try {
      setIsSubmitting(true)
      await signUpWithEmail(data.email, data.password)
      toast.success(t('auth.signUp.success'))
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.signUp.error')

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignUp() {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      toast.success(t('auth.signUp.googleSuccess'))
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.signUp.googleError')

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <SignUpHeader />
      <SignUpFormFields
        isLoading={loading || isSubmitting}
        onGoogleSignUp={handleGoogleSignUp}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
