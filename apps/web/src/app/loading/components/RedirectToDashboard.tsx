'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LoadingView } from './LoadingView'

export function RedirectToDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return <LoadingView />
}
