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
  redirectReason?: string
}

export function CondominiumsPageClient({
  condominiums,
  pagination,
  initialQuery,
  role,
  canCreateCondominium,
  redirectReason,
}: CondominiumsPageClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()
  const toastShownRef = useRef(false)

  useEffect(() => {
    if (!redirectReason || toastShownRef.current) return
    toastShownRef.current = true

    const tp = role === 'management_company' ? 'admin.condominiums' : 'superadmin.condominiums'

    if (redirectReason === 'no-subscription') {
      toast.error(t(`${tp}.noActiveSubscription`))
    } else if (redirectReason === 'limit-reached') {
      toast.error(t(`${tp}.limitReachedMessage`))
    }

    // Clean reason from URL without triggering Next.js navigation
    const url = new URL(window.location.href)

    url.searchParams.delete('reason')
    window.history.replaceState(window.history.state, '', url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
