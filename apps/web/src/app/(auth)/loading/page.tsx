'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrentUser, registerUser, HttpError, ApiErrorCodes } from '@packages/http-client'

import { LoadingView } from './components/LoadingView'

import { useAuth, useUser, useTranslation } from '@/contexts'
import { setUserCookie, clearUserCookie } from '@/libs/cookies'
import { getPendingRegistration, clearPendingRegistration } from '@/libs/storage'
import { useToast } from '@/ui/components/toast'

export default function AuthLoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { t } = useTranslation()
  const { user: firebaseUser, loading: authLoading, signOut, deleteCurrentUser } = useAuth()
  const { setUser, clearUser } = useUser()
  const hasRedirected = useRef(false)
  const hasSignedOut = useRef(false)
  const isRegisteringRef = useRef(false)
  const [token, setToken] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const shouldRegister = searchParams.get('register') === 'true'
  const shouldSignOut = searchParams.get('signout') === 'true'

  // Handle sign out flow
  useEffect(
    function () {
      async function handleSignOut() {
        if (!shouldSignOut || hasSignedOut.current) return

        hasSignedOut.current = true

        // Clear user context
        clearUser()

        // Clear user cookie
        clearUserCookie()

        // Sign out from Firebase (this also clears session cookie)
        await signOut()

        // Redirect to landing page
        hasRedirected.current = true
        router.replace('/')
      }

      handleSignOut()
    },
    [shouldSignOut, signOut, clearUser, router]
  )

  // Get Firebase token when user is available
  useEffect(
    function () {
      // Don't fetch token if signing out
      if (shouldSignOut) return

      if (firebaseUser) {
        firebaseUser.getIdToken().then(setToken)
        setAuthChecked(true)
      } else if (!authLoading) {
        // Auth loading finished but no user - mark as checked
        setAuthChecked(true)
      }
    },
    [firebaseUser, authLoading, shouldSignOut]
  )

  // Register user in database if coming from signup
  useEffect(
    function () {
      // Guard against multiple calls
      if (!token || !shouldRegister || isRegisteringRef.current) return

      async function handleRegistration() {
        isRegisteringRef.current = true
        setIsRegistering(true)

        const pendingData = getPendingRegistration()

        if (!pendingData) {
          isRegisteringRef.current = false
          setIsRegistering(false)

          return
        }

        try {
          const user = await registerUser(token!, pendingData)

          clearPendingRegistration()
          setUser(user)
          setUserCookie(user)

          hasRedirected.current = true
          router.replace('/dashboard')
        } catch (err) {
          if (HttpError.isHttpError(err) && err.code === ApiErrorCodes.CONFLICT) {
            // User exists in DB but not linked to this Firebase account
            clearPendingRegistration()

            try {
              await deleteCurrentUser()
            } catch {
              await signOut()
            }

            toast.error(t('auth.signUp.contactSupport'))
            hasRedirected.current = true
            router.replace('/signup')

            return
          }

          // Database registration failed - delete the Firebase user
          try {
            await deleteCurrentUser()
          } catch {
            await signOut()
          }

          clearPendingRegistration()

          const errorMessage = err instanceof Error ? err.message : t('auth.signUp.error')

          toast.error(errorMessage)
          hasRedirected.current = true
          router.replace('/signup')
        }
      }

      handleRegistration()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, shouldRegister]
  )

  const {
    data: userData,
    error,
    refetch,
  } = useCurrentUser({
    token,
    enabled: !!token && !authLoading && !shouldRegister && !isRegistering && !shouldSignOut,
  })

  useEffect(
    function () {
      if (hasRedirected.current) return

      // Don't process redirects while signing out, registration is in progress or pending
      if (shouldSignOut || shouldRegister || isRegistering) return

      // Wait until auth state has been checked at least once
      if (!authChecked) return

      // Redirect to signin if not authenticated (after auth check completes)
      if (!authLoading && !firebaseUser) {
        hasRedirected.current = true
        router.replace('/signin')

        return
      }

      // Handle USER_NOT_REGISTERED error - redirect to signup
      if (error && HttpError.isHttpError(error) && error.code === ApiErrorCodes.USER_NOT_REGISTERED) {
        hasRedirected.current = true
        toast.error(t('auth.loading.notRegistered'))
        router.replace('/signup')

        return
      }

      // Handle USER_DISABLED error - user account is deactivated
      if (error && HttpError.isHttpError(error) && error.code === ApiErrorCodes.USER_DISABLED) {
        hasRedirected.current = true
        signOut()
        toast.error(t('auth.loading.accountDisabled'))
        router.replace('/signin')

        return
      }

      // Handle successful user fetch - set context, cookie, and redirect
      if (userData) {
        hasRedirected.current = true

        setUser(userData)

        setUserCookie(userData)
        router.replace('/dashboard')
      }
    },
    [authLoading, authChecked, firebaseUser, userData, error, router, setUser, toast, t, shouldSignOut, shouldRegister, isRegistering]
  )

  function handleRetry() {
    refetch()
  }

  async function handleLogout() {
    await signOut()
    router.replace('/signin')
  }

  // Don't show error for codes we handle with redirects
  const isHandledError =
    error &&
    HttpError.isHttpError(error) &&
    (error.code === ApiErrorCodes.USER_NOT_REGISTERED || error.code === ApiErrorCodes.USER_DISABLED)

  const displayError = isHandledError ? null : error?.message ?? null

  return (
    <LoadingView error={displayError} onLogout={handleLogout} onRetry={handleRetry} />
  )
}
