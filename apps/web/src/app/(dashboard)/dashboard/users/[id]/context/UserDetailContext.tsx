'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { useAuth, useTranslation } from '@/contexts'
import { useUserFullDetails, type TUserFullDetails } from '@packages/http-client/hooks'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'

interface IUserDetailContextValue {
  user: TUserFullDetails
  refetch: () => void
}

const UserDetailContext = createContext<IUserDetailContextValue | null>(null)

interface IUserDetailProviderProps {
  userId: string
  children: ReactNode
}

export function UserDetailProvider({ userId, children }: IUserDetailProviderProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading, error, refetch } = useUserFullDetails({
    token,
    userId,
    enabled: !!token && !!userId,
  })

  if (isLoading || !token) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Typography color="danger" variant="body1">
          {t('superadmin.users.detail.loadError')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <UserDetailContext.Provider value={{ user: data.data, refetch }}>
      {children}
    </UserDetailContext.Provider>
  )
}

export function useUserDetail() {
  const context = useContext(UserDetailContext)
  if (!context) {
    throw new Error('useUserDetail must be used within a UserDetailProvider')
  }
  return context
}
