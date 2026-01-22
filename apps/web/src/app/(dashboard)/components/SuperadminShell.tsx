'use client'

import { useDisclosure } from '@heroui/modal'
import { Shield } from 'lucide-react'

import { SuperadminNavbar } from './SuperadminNavbar'
import { SuperadminSidebar } from './SuperadminSidebar'
import { AppDrawer } from '@/ui/components/app-drawer'

interface ISuperadminShellProps {
  children: React.ReactNode
}

export function SuperadminShell({ children }: ISuperadminShellProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <SuperadminNavbar onToggleSidebar={onOpen} />

      <main className="flex-1 overflow-y-auto p-6">{children}</main>

      <AppDrawer
        badge={{ label: 'Superadmin', icon: <Shield size={10} /> }}
        isOpen={isOpen}
        onClose={onClose}
        onOpenChange={onOpenChange}
      >
        <SuperadminSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
