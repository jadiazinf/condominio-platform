'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserCondominiums, registerUser, HttpError, ApiErrorCodes } from '@packages/http-client'

import { LoadingView } from './LoadingView'

import { useAuth, useUser, useCondominium, useSuperadmin, useTranslation } from '@/contexts'
import {
  setUserCookie,
  clearUserCookie,
  setCondominiumsCookie,
  setSelectedCondominiumCookie,
  clearAllCondominiumCookies,
  clearAllSuperadminCookies,
} from '@/libs/cookies'
import { getPendingRegistration, clearPendingRegistration } from '@/libs/storage'
import { useToast } from '@/ui/components/toast'

type TLoadingStep = 'auth' | 'user' | 'condominiums'

interface FlowControl {
  hasRedirected: boolean
  hasSignedOut: boolean
  isRegistering: boolean
  hasProcessedCondominiums: boolean
  hasHandledCondominiumsError: boolean
}

/**
 * Client-side loading flow for registration and sign-out cases.
 * These flows cannot be handled server-side because:
 * - Registration requires sessionStorage (pendingRegistration data)
 * - Sign-out requires Firebase client SDK to clear auth state
 */
export function ClientLoadingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { t } = useTranslation()
  const { user: firebaseUser, loading: authLoading, signOut, deleteCurrentUser } = useAuth()
  const { setUser, clearUser } = useUser()
  const { setCondominiums, selectCondominium, clearAllCondominiums } = useCondominium()
  const { clearSuperadmin } = useSuperadmin()

  const flowControl = useRef<FlowControl>({
    hasRedirected: false,
    hasSignedOut: false,
    isRegistering: false,
    hasProcessedCondominiums: false,
    hasHandledCondominiumsError: false,
  })

  const [token, setToken] = useState<string | null>(null)
  const [, setIsRegistering] = useState(false)
  const [loadingStep, setLoadingStep] = useState<TLoadingStep>('auth')
  const [shouldFetchCondominiums, setShouldFetchCondominiums] = useState(false)

  const shouldRegister = searchParams.get('register') === 'true'
  const shouldSignOut = searchParams.get('signout') === 'true'

  // ============================================
  // CLEANUP FUNCTION
  // ============================================
  const performFullCleanup = useCallback(async () => {
    clearUser()
    clearUserCookie()
    clearAllCondominiums()
    clearAllCondominiumCookies()
    clearSuperadmin()
    clearAllSuperadminCookies()
    await signOut()
  }, [clearUser, clearAllCondominiums, clearSuperadmin, signOut])

  // ============================================
  // SIGNOUT FLOW
  // ============================================
  useEffect(
    function handleSignOutFlow() {
      async function executeSignOut() {
        if (!shouldSignOut || flowControl.current.hasSignedOut) return

        flowControl.current.hasSignedOut = true

        clearUser()
        clearAllCondominiums()
        clearUserCookie()
        clearAllCondominiumCookies()
        clearSuperadmin()
        clearAllSuperadminCookies()
        await signOut()

        flowControl.current.hasRedirected = true
        router.replace('/')
      }

      executeSignOut()
    },
    [shouldSignOut, signOut, clearUser, clearAllCondominiums, clearSuperadmin, router]
  )

  // ============================================
  // TOKEN ACQUISITION
  // ============================================
  useEffect(
    function acquireToken() {
      if (shouldSignOut) return

      if (firebaseUser) {
        firebaseUser.getIdToken().then(setToken)
      }
    },
    [firebaseUser, authLoading, shouldSignOut]
  )

  // ============================================
  // REGISTRATION FLOW
  // ============================================
  useEffect(() => {
    if (!token || !shouldRegister || flowControl.current.isRegistering) return

    async function executeRegistration() {
      flowControl.current.isRegistering = true
      setIsRegistering(true)

      const pendingData = getPendingRegistration()

      if (!pendingData) {
        flowControl.current.isRegistering = false
        setIsRegistering(false)

        // No pending registration data found - this shouldn't happen normally
        // Redirect to signup to start fresh
        toast.error(t('auth.loading.noPendingData'))
        flowControl.current.hasRedirected = true
        router.replace('/signup')

        return
      }

      try {
        const user = await registerUser(token!, pendingData)

        clearPendingRegistration()
        setUser(user)
        setUserCookie(user)

        // New user has no condominiums, go directly to dashboard
        setCondominiums([])
        setCondominiumsCookie([])

        flowControl.current.hasRedirected = true
        router.replace('/dashboard')
      } catch (err) {
        if (HttpError.isHttpError(err) && err.code === ApiErrorCodes.CONFLICT) {
          clearPendingRegistration()

          try {
            await deleteCurrentUser()
          } catch {
            await signOut()
          }

          toast.error(t('auth.signUp.contactSupport'))
          flowControl.current.hasRedirected = true
          router.replace('/signup')

          return
        }

        try {
          await deleteCurrentUser()
        } catch {
          await signOut()
        }

        clearPendingRegistration()

        const errorMessage = err instanceof Error ? err.message : t('auth.signUp.error')

        toast.error(errorMessage)
        flowControl.current.hasRedirected = true
        router.replace('/signup')
      }
    }

    executeRegistration()
  }, [token, shouldRegister])

  // ============================================
  // CONDOMINIUMS FETCH (only after registration)
  // ============================================
  const {
    data: condominiumsData,
    error: condominiumsError,
    isSuccess: condominiumsFetched,
    refetch: refetchCondominiums,
  } = useUserCondominiums({
    token,
    enabled: shouldFetchCondominiums && !!token && !shouldSignOut,
  })

  // ============================================
  // PROCESS CONDOMINIUMS & REDIRECT
  // ============================================
  useEffect(() => {
    if (flowControl.current.hasRedirected || flowControl.current.hasProcessedCondominiums) return
    if (!condominiumsFetched) return

    flowControl.current.hasProcessedCondominiums = true

    // Handle case where API returns empty or undefined condominiums
    const userCondominiums = condominiumsData?.condominiums ?? []

    setCondominiums(userCondominiums)
    setCondominiumsCookie(userCondominiums)

    // Use actual array length instead of total from API
    if (userCondominiums.length === 0) {
      flowControl.current.hasRedirected = true
      router.replace('/dashboard')

      return
    }

    if (userCondominiums.length === 1) {
      const singleCondominium = userCondominiums[0]

      selectCondominium(singleCondominium)
      setSelectedCondominiumCookie(singleCondominium)

      flowControl.current.hasRedirected = true
      router.replace('/dashboard')

      return
    }

    // Multiple condominiums - let user select
    flowControl.current.hasRedirected = true
    router.replace('/select-condominium')
  }, [condominiumsFetched, condominiumsData, setCondominiums, selectCondominium, router])

  // ============================================
  // CONDOMINIUMS ERROR HANDLING
  // ============================================
  useEffect(
    function handleCondominiumsErrors() {
      if (
        !condominiumsError ||
        flowControl.current.hasHandledCondominiumsError ||
        flowControl.current.hasRedirected
      )
        return

      flowControl.current.hasHandledCondominiumsError = true

      async function executeErrorHandling() {
        await performFullCleanup()

        toast.error(t('auth.loading.error'))
        flowControl.current.hasRedirected = true
        router.replace('/signin')
      }

      executeErrorHandling()
    },
    [condominiumsError, performFullCleanup, toast, t, router]
  )

  // ============================================
  // HANDLERS
  // ============================================
  function handleRetry() {
    flowControl.current.hasHandledCondominiumsError = false
    refetchCondominiums()
  }

  async function handleLogout() {
    await performFullCleanup()
    router.replace('/signin')
  }

  // ============================================
  // RENDER
  // ============================================
  const displayError = condominiumsError?.message ?? null

  return (
    <LoadingView
      error={displayError}
      step={loadingStep}
      onLogout={handleLogout}
      onRetry={handleRetry}
    />
  )
}
