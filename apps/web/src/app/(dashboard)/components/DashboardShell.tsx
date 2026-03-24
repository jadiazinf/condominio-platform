'use client'

import type { TUser } from '@packages/domain'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

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
  const mainRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  function handleSidebarSelect() {
    onClose()
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <DashboardNavbar initialUser={initialUser} onToggleSidebar={onOpen} />

      <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

      <AppDrawer isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange}>
        <DashboardSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
