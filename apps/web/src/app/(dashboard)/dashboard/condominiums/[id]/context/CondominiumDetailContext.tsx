'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { TCondominium, TActiveRoleType } from '@packages/domain'

interface ICondominiumDetailContext {
  condominium: TCondominium
  currentUserId?: string
  userRole?: TActiveRoleType | null
}

const CondominiumDetailContext = createContext<ICondominiumDetailContext | undefined>(undefined)

export function CondominiumDetailProvider({
  children,
  condominium,
  currentUserId,
  userRole,
}: {
  children: ReactNode
  condominium: TCondominium
  currentUserId?: string
  userRole?: TActiveRoleType | null
}) {
  return (
    <CondominiumDetailContext.Provider value={{ condominium, currentUserId, userRole }}>
      {children}
    </CondominiumDetailContext.Provider>
  )
}

export function useCondominiumDetail() {
  const context = useContext(CondominiumDetailContext)
  if (context === undefined) {
    throw new Error('useCondominiumDetail must be used within a CondominiumDetailProvider')
  }
  return context
}
