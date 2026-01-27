'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { setGlobalAuthToken, createHttpClient, setHttpClient } from '@packages/http-client'

import { getFirebaseAuth } from '@/libs/firebase'
import { setSessionCookie, getSessionCookie } from '@/libs/cookies'

interface IHttpClientProviderProps {
  children: ReactNode
}

export function HttpClientProvider({ children }: IHttpClientProviderProps) {
  const isInitialized = useRef(false)

  useEffect(() => {
    // Prevent multiple initializations (strict mode + potential re-renders)
    if (isInitialized.current) return

    isInitialized.current = true

    console.log('[HttpClientProvider] Initializing...')

    // Set global auth token getter - this ensures even the default client has auth
    setGlobalAuthToken(() => {
      const token = getSessionCookie()
      console.log('[HttpClientProvider] Getting token from cookie:', token ? `${token.substring(0, 20)}...` : 'null')
      return token || null
    })

    // Configure HTTP client with token refresh capability
    const client = createHttpClient({
      getAuthToken: async () => {
        const token = getSessionCookie()
        console.log('[HttpClientProvider] Client getAuthToken:', token ? `${token.substring(0, 20)}...` : 'null')
        return token || null
      },
      onTokenRefresh: async () => {
        // Get current user and refresh token
        const auth = getFirebaseAuth()
        const user = auth.currentUser

        if (!user) {
          console.error('[HttpClientProvider] No user logged in for token refresh')
          return
        }

        // Force refresh the token
        await setSessionCookie(user, true)
        console.log('[HttpClientProvider] Token refreshed after 401')
      },
    })

    setHttpClient(client)
    console.log('[HttpClientProvider] HTTP client initialized')
  }, [])

  return <>{children}</>
}
