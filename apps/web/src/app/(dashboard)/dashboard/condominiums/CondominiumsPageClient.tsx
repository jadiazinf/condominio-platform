'use client'

import type { TCondominium, TCondominiumsQuery, TPaginationMeta, TActiveRoleType } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { CondominiumsTable } from './components'

interface CondominiumsPageClientProps {
  condominiums: TCondominium[]
  pagination: TPaginationMeta
  initialQuery: TCondominiumsQuery
  role?: TActiveRoleType | null
}

export function CondominiumsPageClient({
  condominiums,
  pagination,
  initialQuery,
  role,
}: CondominiumsPageClientProps) {
  const { t } = useTranslation()

  const isAdmin = role === 'management_company'
  const translationPrefix = isAdmin ? 'admin.condominiums' : 'superadmin.condominiums'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">
          {t(`${translationPrefix}.title`)}
        </h1>
        <p className="mt-2 text-sm text-default-500">
          {t(`${translationPrefix}.subtitle`)}
        </p>
      </div>

      <CondominiumsTable
        condominiums={condominiums}
        pagination={pagination}
        initialQuery={initialQuery}
        role={role}
      />
    </div>
  )
}
