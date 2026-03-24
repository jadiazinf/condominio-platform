'use client'

import type { TUser } from '@packages/domain'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { SuperadminNavbar } from './SuperadminNavbar'
import { SuperadminSidebar } from './SuperadminSidebar'

import { useDisclosure } from '@/ui/components/modal'
import { AppDrawer } from '@/ui/components/app-drawer'

interface ISuperadminShellProps {
  children: React.ReactNode
  initialUser?: TUser | null
}

export function SuperadminShell({ children, initialUser }: ISuperadminShellProps) {
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
      <SuperadminNavbar initialUser={initialUser} onToggleSidebar={onOpen} />

      <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

      <AppDrawer isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange}>
        <SuperadminSidebar onItemSelect={handleSidebarSelect} />
      </AppDrawer>
    </div>
  )
}
