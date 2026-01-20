'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RedirectToSelectCondominium() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/select-condominium')
  }, [router])

  return null
}
