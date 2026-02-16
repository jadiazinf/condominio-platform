'use client'

import type { ReactNode } from 'react'
import type { TCondominium, TActiveRoleType } from '@packages/domain'
import { CondominiumDetailHeader } from './CondominiumDetailHeader'
import { CondominiumDetailSidebar } from './CondominiumDetailSidebar'
import { CondominiumDetailProvider } from '../context/CondominiumDetailContext'

interface ICondominiumDetailLayoutProps {
  children: ReactNode
  condominium: TCondominium
  currentUserId?: string
  userRole?: TActiveRoleType | null
}

export function CondominiumDetailLayout({
  children,
  condominium,
  currentUserId,
  userRole,
}: ICondominiumDetailLayoutProps) {
  return (
    <CondominiumDetailProvider condominium={condominium} currentUserId={currentUserId} userRole={userRole}>
      <div className="max-w-6xl mx-auto">
        <CondominiumDetailHeader condominium={condominium} />
        <div className="flex flex-col md:flex-row gap-8 mt-6">
          <CondominiumDetailSidebar condominiumId={condominium.id} userRole={userRole} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </CondominiumDetailProvider>
  )
}
