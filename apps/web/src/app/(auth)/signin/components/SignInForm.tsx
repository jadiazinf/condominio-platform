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

  // TEMPORARILY DISABLED to debug infinite loop
  // Clear expired session cookies when redirected with expired=true
  // useEffect(
  //   function () {
  //     const expired = searchParams.get('expired')

  //     if (expired === 'true') {
  //       const clearExpiredSession = async function () {
  //         clearSessionCookie()
  //         clearUserCookie()
  //         try {
  //           await signOut()
  //         } catch {
  //           // Ignore signOut errors since we're already clearing cookies
  //         }
  //         // Clean URL only after signOut completes
  //         router.replace('/signin')
  //       }

  //       clearExpiredSession()
  //     }
  //   },
  //   [searchParams, router, signOut]
  // )

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
