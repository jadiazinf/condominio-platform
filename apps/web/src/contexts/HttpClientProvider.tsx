'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { setGlobalAuthToken, createHttpClient, setHttpClient } from '@packages/http-client'

import { getFirebaseAuth } from '@/libs/firebase'
import { setSessionCookie, getSessionCookie } from '@/libs/cookies'

// Initialize HTTP client synchronously on module load to avoid race conditions
// This ensures the client is ready before any React Query hooks execute
let isModuleInitialized = false

function initializeHttpClient() {
  if (isModuleInitialized) return
  isModuleInitialized = true

  console.log('[HttpClientProvider] Initializing HTTP client (module level)...')

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
}

// Initialize immediately when module is imported
if (typeof window !== 'undefined') {
  initializeHttpClient()
}

interface IHttpClientProviderProps {
  children: ReactNode
}

export function HttpClientProvider({ children }: IHttpClientProviderProps) {
  const isInitialized = useRef(false)

  useEffect(() => {
    // Ensure initialization happens on client side (backup for SSR)
    if (isInitialized.current) return
    isInitialized.current = true

    initializeHttpClient()
  }, [])

  return <>{children}</>
}
