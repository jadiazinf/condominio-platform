'use client'

import type { TUserCondominiumAccess } from '@packages/domain'

import { useEffect } from 'react'

import { useCondominium } from '@/contexts'
import { setCondominiumsCookie, setSelectedCondominiumCookie } from '@/libs/cookies'

interface CondominiumHydrationProps {
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
}

export function CondominiumHydration({
  condominiums,
  selectedCondominium,
}: CondominiumHydrationProps) {
  const { setCondominiums, selectCondominium } = useCondominium()

  useEffect(() => {
    // Set condominiums in context and cookie
    setCondominiums(condominiums)
    setCondominiumsCookie(condominiums)

    // Set selected condominium if provided
    if (selectedCondominium) {
      selectCondominium(selectedCondominium)
      setSelectedCondominiumCookie(selectedCondominium)
    }
  }, [condominiums, selectedCondominium, setCondominiums, selectCondominium])

  return null
}
