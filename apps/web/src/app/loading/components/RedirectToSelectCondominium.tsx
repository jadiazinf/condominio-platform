'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LoadingView } from './LoadingView'

export function RedirectToSelectCondominium() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/select-condominium')
  }, [router])

  return <LoadingView />
}
