'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { LoadingView } from './LoadingView'

/**
 * Client component that calls the session API to set cookies and get redirect path.
 * The API sets cookies in the response, and this component handles the redirect.
 */
export function ServerSessionFlow() {
  const router = useRouter()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function initSession() {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        })

        const data = await response.json()

        router.replace(data.redirectTo)
      } catch {
        router.replace('/signin')
      }
    }

    initSession()
  }, [router])

  return <LoadingView />
}
