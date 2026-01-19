'use client'

import { useDisclosure } from '@heroui/use-disclosure'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@heroui/drawer'

import { DashboardNavbar } from './DashboardNavbar'
import { DashboardSidebar } from './DashboardSidebar'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <DashboardNavbar onToggleSidebar={onOpen} />

      <main className="flex-1 overflow-y-auto p-6">{children}</main>

      <Drawer hideCloseButton isOpen={isOpen} placement="left" onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="border-b border-divider">
            <span className="text-lg font-bold">Menu</span>
          </DrawerHeader>
          <DrawerBody className="p-4">
            <DashboardSidebar onItemSelect={handleSidebarSelect} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
