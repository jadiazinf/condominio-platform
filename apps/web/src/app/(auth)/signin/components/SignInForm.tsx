'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type TSignInSchema } from '@packages/domain'

import { SignInFormFields } from './SignInFormFields'
import { SignInHeader } from './SignInHeader'

import { useAuth, useTranslation, getFirebaseErrorKey } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { clearUserCookie, clearSessionCookie } from '@/libs/cookies'

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { t } = useTranslation()
  const { signInWithEmail, signInWithGoogle, loading, signOut } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasCleanedExpiredSession = useRef(false)

  // Clear expired session cookies when redirected with expired=true
  useEffect(
    function () {
      const expired = searchParams.get('expired')

      if (expired === 'true' && !hasCleanedExpiredSession.current) {
        // Mark as cleaned immediately to prevent re-execution
        hasCleanedExpiredSession.current = true

        // Clear cookies FIRST (synchronously) to break the redirect loop
        clearSessionCookie()
        clearUserCookie()

        // Then try to signOut from Firebase (async, but don't wait for it)
        signOut().catch(() => {
          // Ignore signOut errors since we've already cleared cookies
        })

        // Clean the URL by removing the expired parameter
        router.replace('/signin')
      }
    },
    [searchParams, router, signOut]
  )

  async function handleSubmit(data: TSignInSchema) {
    try {
      setIsSubmitting(true)
      await signInWithEmail(data.email, data.password)
      // Use window.location for a full page reload to ensure the cookie is sent with the request
      // router.push() causes a client-side navigation that may not include the newly set cookie
      window.location.href = '/dashboard'
    } catch (err) {
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      // Use window.location for a full page reload to ensure the cookie is sent with the request
      // router.push() causes a client-side navigation that may not include the newly set cookie
      window.location.href = '/dashboard'
    } catch (err) {
      const errorKey = getFirebaseErrorKey(err)

      toast.error(t(errorKey))
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
