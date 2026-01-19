'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type TSignInSchema } from '@packages/domain'

import { SignInFormFields } from './SignInFormFields'
import { SignInHeader } from './SignInHeader'

import { useAuth, useTranslation, getFirebaseErrorKey } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { clearUserCookie } from '@/libs/cookies'

function clearSessionCookie(): void {
  document.cookie = '__session=; path=/; max-age=0; SameSite=Lax; Secure'
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { t } = useTranslation()
  const { signInWithEmail, signInWithGoogle, loading, signOut } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Clear expired session cookies when redirected with expired=true
  useEffect(
    function () {
      const expired = searchParams.get('expired')

      if (expired === 'true') {
        clearSessionCookie()
        clearUserCookie()
        signOut().catch(function () {
          // Ignore signOut errors since we're already clearing cookies
        })
        // Clean URL
        router.replace('/signin')
      }
    },
    [searchParams, router, signOut]
  )

  async function handleSubmit(data: TSignInSchema) {
    try {
      setIsSubmitting(true)
      await signInWithEmail(data.email, data.password)
      router.push('/loading')
    } catch (err) {
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      router.push('/loading')
    } catch (err) {
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
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
