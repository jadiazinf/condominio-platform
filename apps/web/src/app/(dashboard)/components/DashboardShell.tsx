'use client'

import type { TUser } from '@packages/domain'

import { DashboardNavbar } from './DashboardNavbar'
import { DashboardSidebar } from './DashboardSidebar'

import { useDisclosure } from '@/ui/components/modal'
import { AppDrawer } from '@/ui/components/app-drawer'

interface IDashboardShellProps {
  children: React.ReactNode
  /** Initial user data from server to prevent avatar flash */
  initialUser?: TUser | null
}

export function DashboardShell({ children, initialUser }: IDashboardShellProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <DashboardNavbar initialUser={initialUser} onToggleSidebar={onOpen} />

      <main className="flex-1 overflow-y-auto p-6">{children}</main>

      <AppDrawer isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange}>
        <DashboardSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
