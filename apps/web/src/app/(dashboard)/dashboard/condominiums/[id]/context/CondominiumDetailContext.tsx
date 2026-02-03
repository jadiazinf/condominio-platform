'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { TCondominium } from '@packages/domain'

interface ICondominiumDetailContext {
  condominium: TCondominium
  currentUserId?: string
}

const CondominiumDetailContext = createContext<ICondominiumDetailContext | undefined>(undefined)

export function CondominiumDetailProvider({
  children,
  condominium,
  currentUserId,
}: {
  children: ReactNode
  condominium: TCondominium
  currentUserId?: string
}) {
  return (
    <CondominiumDetailContext.Provider value={{ condominium, currentUserId }}>
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
