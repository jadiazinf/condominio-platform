'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useUserCondominiums,
  registerUser,
  HttpError,
  ApiErrorCodes,
} from '@packages/http-client'

import { LoadingView } from './LoadingView'

import { useAuth, useUser, useCondominium, useTranslation } from '@/contexts'
import {
  setUserCookie,
  clearUserCookie,
  setCondominiumsCookie,
  setSelectedCondominiumCookie,
  clearAllCondominiumCookies,
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

  const flowControl = useRef<FlowControl>({
    hasRedirected: false,
    hasSignedOut: false,
    isRegistering: false,
    hasProcessedCondominiums: false,
    hasHandledCondominiumsError: false,
  })

  const [token, setToken] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
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
    await signOut()
  }, [clearUser, clearAllCondominiums, signOut])

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
        await signOut()

        flowControl.current.hasRedirected = true
        router.replace('/')
      }

      executeSignOut()
    },
    [shouldSignOut, signOut, clearUser, clearAllCondominiums, router]
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
  useEffect(
    function handleRegistrationFlow() {
      if (!token || !shouldRegister || flowControl.current.isRegistering) return

      async function executeRegistration() {
        flowControl.current.isRegistering = true
        setIsRegistering(true)

        const pendingData = getPendingRegistration()

        if (!pendingData) {
          flowControl.current.isRegistering = false
          setIsRegistering(false)

          return
        }

        try {
          const user = await registerUser(token!, pendingData)

          clearPendingRegistration()
          setUser(user)
          setUserCookie(user)

          setShouldFetchCondominiums(true)
          setLoadingStep('condominiums')
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, shouldRegister]
  )

  // ============================================
  // CONDOMINIUMS FETCH (only after registration)
  // ============================================
  const {
    data: condominiumsData,
    error: condominiumsError,
    refetch: refetchCondominiums,
  } = useUserCondominiums({
    token,
    enabled: shouldFetchCondominiums && !!token && !shouldSignOut,
  })

  // ============================================
  // PROCESS CONDOMINIUMS & REDIRECT
  // ============================================
  useEffect(
    function processCondominiumsAndRedirect() {
      if (flowControl.current.hasRedirected || flowControl.current.hasProcessedCondominiums) return
      if (!condominiumsData) return

      flowControl.current.hasProcessedCondominiums = true

      const { condominiums: userCondominiums, total } = condominiumsData

      setCondominiums(userCondominiums)
      setCondominiumsCookie(userCondominiums)

      if (total === 0) {
        flowControl.current.hasRedirected = true
        router.replace('/dashboard')

        return
      }

      if (total === 1) {
        const singleCondominium = userCondominiums[0]

        selectCondominium(singleCondominium)
        setSelectedCondominiumCookie(singleCondominium)

        flowControl.current.hasRedirected = true
        router.replace('/dashboard')

        return
      }

      flowControl.current.hasRedirected = true
      router.replace('/select-condominium')
    },
    [condominiumsData, setCondominiums, selectCondominium, router]
  )

  // ============================================
  // CONDOMINIUMS ERROR HANDLING
  // ============================================
  useEffect(
    function handleCondominiumsErrors() {
      if (!condominiumsError || flowControl.current.hasHandledCondominiumsError || flowControl.current.hasRedirected)
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
