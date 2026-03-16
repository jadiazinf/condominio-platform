'use client'

import type { TUser } from '@packages/domain'

import { AdminNavbar } from './AdminNavbar'
import { AdminSidebar } from './AdminSidebar'

import { useDisclosure } from '@/ui/components/modal'
import { AppDrawer } from '@/ui/components/app-drawer'

interface IAdminShellProps {
  children: React.ReactNode
  initialUser?: TUser | null
}

export function AdminShell({ children, initialUser }: IAdminShellProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <AdminNavbar initialUser={initialUser} onToggleSidebar={onOpen} />

      <main className="flex-1 overflow-y-auto p-6">{children}</main>

      <AppDrawer isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange}>
        <AdminSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
