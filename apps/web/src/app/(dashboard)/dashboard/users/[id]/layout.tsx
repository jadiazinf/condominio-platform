'use client'

import { UserDetailProvider, useUserDetail } from './context/UserDetailContext'
import { UserDetailHeader } from './components/UserDetailHeader'
import { UserDetailSidebar } from './components/UserDetailSidebar'

interface IUserDetailLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

function UserDetailLayoutContent({
  children,
  userId,
}: {
  children: React.ReactNode
  userId: string
}) {
  const { user } = useUserDetail()

  return (
    <div className="max-w-6xl mx-auto">
      <UserDetailHeader user={user} />

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        <UserDetailSidebar userId={userId} isSuperadmin={user.isSuperadmin} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

export default function UserDetailLayout({ children, params }: IUserDetailLayoutProps) {
  // Use React.use to unwrap the params promise (Next.js 15+)
  const { id: userId } = require('react').use(params)

  return (
    <UserDetailProvider userId={userId}>
      <UserDetailLayoutContent userId={userId}>{children}</UserDetailLayoutContent>
    </UserDetailProvider>
  )
}
