'use client'

import type { TUserCondominiumAccess } from '@packages/domain'

import { CondominiumCard } from './CondominiumCard'

interface CondominiumListProps {
  condominiums: TUserCondominiumAccess[]
  onSelect: (condominium: TUserCondominiumAccess) => void
}

export function CondominiumList({ condominiums, onSelect }: CondominiumListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {condominiums.map(condominium => (
        <CondominiumCard
          key={condominium.condominium.id}
          condominium={condominium}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
