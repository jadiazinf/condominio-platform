'use client'

import type {
  TCondominium,
  TCondominiumsQuery,
  TPaginationMeta,
  TActiveRoleType,
} from '@packages/domain'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { CondominiumsTable } from './components'

import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

interface CondominiumsPageClientProps {
  condominiums: TCondominium[]
  pagination: TPaginationMeta
  initialQuery: TCondominiumsQuery
  role?: TActiveRoleType | null
  canCreateCondominium?: boolean
  limitReached?: boolean
  maxCondominiums?: number
  currentCondominiums?: number
}

export function CondominiumsPageClient({
  condominiums,
  pagination,
  initialQuery,
  role,
  canCreateCondominium,
  limitReached,
  maxCondominiums,
  currentCondominiums,
}: CondominiumsPageClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()
  const toastShownRef = useRef(false)

  useEffect(() => {
    if (limitReached && !toastShownRef.current) {
      toastShownRef.current = true
      const translationPrefix =
        role === 'management_company' ? 'admin.condominiums' : 'superadmin.condominiums'

      toast.error(
        t(`${translationPrefix}.limitReached`, {
          max: String(maxCondominiums ?? '∞'),
          current: String(currentCondominiums ?? 0),
        })
      )
      // Clean the URL param without triggering a navigation
      router.replace('/dashboard/condominiums', { scroll: false })
    }
  }, [limitReached, maxCondominiums, currentCondominiums, role, t, toast, router])

  const isAdmin = role === 'management_company'
  const translationPrefix = isAdmin ? 'admin.condominiums' : 'superadmin.condominiums'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">{t(`${translationPrefix}.title`)}</h1>
        <p className="mt-2 text-sm text-default-500">{t(`${translationPrefix}.subtitle`)}</p>
      </div>

      <CondominiumsTable
        canCreateCondominium={canCreateCondominium}
        condominiums={condominiums}
        initialQuery={initialQuery}
        pagination={pagination}
        role={role}
      />
    </div>
  )
}
