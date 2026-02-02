'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/contexts'
import { useUserFullDetails, type TUserFullDetails } from '@packages/http-client/hooks'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'

import { UserDetailHeader } from './UserDetailHeader'
import { UserDetailSidebar } from './UserDetailSidebar'

interface IUserDetailLayoutProps {
  userId: string
  children: React.ReactNode
}

export function UserDetailLayout({ userId, children }: IUserDetailLayoutProps) {
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
          Error loading user details
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const user = data.data

  return (
    <div className="max-w-6xl mx-auto">
      <UserDetailHeader user={user} />

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        <UserDetailSidebar userId={userId} isSuperadmin={user.isSuperadmin} />
        <main className="flex-1 min-w-0">
          {/* Pass user data to children through context or clone */}
          {children}
        </main>
      </div>
    </div>
  )
}

// Export user context for child pages to access
export { type TUserFullDetails }
