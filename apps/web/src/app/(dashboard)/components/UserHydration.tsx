'use client'

import type { TUser } from '@packages/domain'

import { useEffect } from 'react'

import { useUser } from '@/contexts'

interface UserHydrationProps {
  user: TUser | null
}

export function UserHydration({ user }: UserHydrationProps) {
  const { setUser } = useUser()

  useEffect(() => {
    if (user) {
      setUser(user)
    }
  }, [user, setUser])

  return null
}
