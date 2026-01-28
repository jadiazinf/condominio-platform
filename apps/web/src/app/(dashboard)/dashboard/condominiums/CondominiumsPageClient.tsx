'use client'

import type { TCondominium, TCondominiumsQuery, TPaginationMeta } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { CondominiumsTable } from './components'

interface CondominiumsPageClientProps {
  condominiums: TCondominium[]
  pagination: TPaginationMeta
  initialQuery: TCondominiumsQuery
}

export function CondominiumsPageClient({
  condominiums,
  pagination,
  initialQuery,
}: CondominiumsPageClientProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">
          {t('superadmin.condominiums.title')}
        </h1>
        <p className="mt-2 text-sm text-default-500">
          {t('superadmin.condominiums.subtitle')}
        </p>
      </div>

      <CondominiumsTable
        condominiums={condominiums}
        pagination={pagination}
        initialQuery={initialQuery}
      />
    </div>
  )
}
