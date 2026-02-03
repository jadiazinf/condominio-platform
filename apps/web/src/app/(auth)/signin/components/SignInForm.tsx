'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type TSignInSchema } from '@packages/domain'

import { SignInFormFields } from './SignInFormFields'
import { SignInHeader } from './SignInHeader'

import { useAuth, useTranslation, getFirebaseErrorKey } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { clearUserCookie, clearSessionCookie } from '@/libs/cookies'

/**
 * Validates that a redirect URL is safe (internal path only, no external URLs).
 * Returns the validated path or '/dashboard' as fallback.
 */
function getValidRedirectUrl(redirectParam: string | null): string {
  if (!redirectParam) return '/dashboard'

  // Must start with / (relative path) and not // (protocol-relative URL)
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) {
    return '/dashboard'
  }

  // Ensure it's a valid internal path (no javascript:, data:, etc.)
  try {
    const url = new URL(redirectParam, 'http://localhost')
    // Only allow paths within the app
    if (url.pathname !== redirectParam.split('?')[0]) {
      return '/dashboard'
    }
  } catch {
    return '/dashboard'
  }

  return redirectParam
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { t } = useTranslation()
  const { signInWithEmail, signInWithGoogle, loading, signOut } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasCleanedExpiredSession = useRef(false)
  const hasHandledTemporaryError = useRef(false)
  const hasHandledUserNotFound = useRef(false)
  const hasHandledInactivity = useRef(false)

  // Get the validated redirect URL from search params
  const redirectUrl = useMemo(
    () => getValidRedirectUrl(searchParams.get('redirect')),
    [searchParams]
  )

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

  // Handle temporary errors (API unavailable, rate limits, etc.)
  useEffect(
    function () {
      const error = searchParams.get('error')

      if (error === 'temporary' && !hasHandledTemporaryError.current) {
        // Mark as handled immediately to prevent re-execution
        hasHandledTemporaryError.current = true

        // Clear cookies to break the redirect loop
        clearSessionCookie()
        clearUserCookie()

        // Sign out from Firebase
        signOut().catch(() => {
          // Ignore signOut errors since we've already cleared cookies
        })

        // Show error message to user
        toast.error(t('auth.errors.temporaryError'))

        // Clean the URL by removing the error parameter
        router.replace('/signin')
      }
    },
    [searchParams, router, signOut, toast, t]
  )

  // Handle user not found (Firebase session exists but user not in database)
  useEffect(
    function () {
      const notfound = searchParams.get('notfound')

      if (notfound === 'true' && !hasHandledUserNotFound.current) {
        // Mark as handled immediately to prevent re-execution
        hasHandledUserNotFound.current = true

        // Clear cookies to break the redirect loop
        clearSessionCookie()
        clearUserCookie()

        // Sign out from Firebase
        signOut().catch(() => {
          // Ignore signOut errors since we've already cleared cookies
        })

        // Show error message to user
        toast.error(t('auth.errors.userNotFound'))

        // Clean the URL by removing the notfound parameter
        router.replace('/signin')
      }
    },
    [searchParams, router, signOut, toast, t]
  )

  // Handle session expired due to inactivity
  useEffect(
    function () {
      const inactivity = searchParams.get('inactivity')

      if (inactivity === 'true' && !hasHandledInactivity.current) {
        // Mark as handled immediately to prevent re-execution
        hasHandledInactivity.current = true

        // Clear cookies (should already be cleared, but just in case)
        clearSessionCookie()
        clearUserCookie()

        // Sign out from Firebase (should already be signed out)
        signOut().catch(() => {
          // Ignore signOut errors since we've already cleared cookies
        })

        // Show info message to user (not error, since it's expected behavior)
        toast.show(t('auth.errors.sessionExpiredInactivity'))

        // Clean the URL by removing the inactivity parameter
        router.replace('/signin')
      }
    },
    [searchParams, router, signOut, toast, t]
  )

  async function handleSubmit(data: TSignInSchema) {
    try {
      setIsSubmitting(true)
      await signInWithEmail(data.email, data.password)
      // Use window.location for a full page reload to ensure the cookie is sent with the request
      // router.push() causes a client-side navigation that may not include the newly set cookie
      window.location.href = redirectUrl
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
      window.location.href = redirectUrl
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
