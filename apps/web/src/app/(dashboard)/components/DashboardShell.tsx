'use client'

import { useDisclosure } from '@heroui/modal'

import { DashboardNavbar } from './DashboardNavbar'
import { DashboardSidebar } from './DashboardSidebar'
import { AppDrawer } from '@/ui/components/app-drawer'

interface IDashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: IDashboardShellProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <DashboardNavbar onToggleSidebar={onOpen} />

      <main className="flex-1 overflow-y-auto p-6">{children}</main>

      <AppDrawer isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange}>
        <DashboardSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
