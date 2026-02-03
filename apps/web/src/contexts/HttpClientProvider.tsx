'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { setGlobalAuthToken, createHttpClient, setHttpClient } from '@packages/http-client'

import { getFirebaseAuth } from '@/libs/firebase'
import { setSessionCookie, getSessionCookie } from '@/libs/cookies'
import { getLocaleCookie } from '@/libs/i18n/utils'
import { tokenRefreshManager } from '@/libs/auth'

// Initialize HTTP client synchronously on module load to avoid race conditions
// This ensures the client is ready before any React Query hooks execute
let isModuleInitialized = false

/**
 * Perform the actual token refresh
 * This is extracted so it can be used by both the HTTP client and the manager
 */
async function performTokenRefresh(): Promise<void> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('No user available for token refresh')
  }

  // Force refresh the token
  await setSessionCookie(user, true)
}

function initializeHttpClient() {
  if (isModuleInitialized) return
  isModuleInitialized = true

  // Set up the token refresh manager with the refresh function
  tokenRefreshManager.setRefreshFunction(performTokenRefresh)

  // Set global auth token getter - this ensures even the default client has auth
  setGlobalAuthToken(() => {
    const token = getSessionCookie()
    return token || null
  })

  // Configure HTTP client with token refresh capability and locale support
  const client = createHttpClient({
    getAuthToken: async () => {
      // If a refresh is in progress, wait for it before returning the token
      await tokenRefreshManager.waitForRefresh()
      const token = getSessionCookie()
      return token || null
    },
    getLocale: () => {
      const locale = getLocaleCookie()
      return locale || 'es'
    },
    onTokenRefresh: async () => {
      // Use the manager to handle refresh with queuing
      await tokenRefreshManager.handle401()
    },
  })

  setHttpClient(client)
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
