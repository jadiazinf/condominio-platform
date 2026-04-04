'use client'

import { useEffect } from 'react'
import { setSelectedCondominiumCookie } from '@/libs/cookies'

interface SetCondominiumCookieProps {
  condominiumId: string
  condominiumName: string
  condominiumCode: string | null
}

export function SetCondominiumCookie({
  condominiumId,
  condominiumName,
  condominiumCode,
}: SetCondominiumCookieProps) {
  useEffect(() => {
    setSelectedCondominiumCookie({
      condominium: {
        id: condominiumId,
        name: condominiumName,
        code: condominiumCode,
        address: null,
        isActive: true,
      },
      roles: [],
      units: [],
    } as any)
  }, [condominiumId, condominiumName, condominiumCode])

  return null
}
