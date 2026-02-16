'use client'

import type { TUser } from '@packages/domain'

import { useDisclosure } from '@/ui/components/modal'

import { SuperadminNavbar } from './SuperadminNavbar'
import { SuperadminSidebar } from './SuperadminSidebar'
import { AppDrawer } from '@/ui/components/app-drawer'

interface ISuperadminShellProps {
  children: React.ReactNode
  initialUser?: TUser | null
}

export function SuperadminShell({ children, initialUser }: ISuperadminShellProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <SuperadminNavbar onToggleSidebar={onOpen} initialUser={initialUser} />

      <main className="flex-1 overflow-y-auto p-6">{children}</main>

      <AppDrawer isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange}>
        <SuperadminSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
