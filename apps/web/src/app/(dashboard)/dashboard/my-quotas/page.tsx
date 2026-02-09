import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { getFullSession } from '@/libs/session'
import { Skeleton } from '@/ui/components/skeleton'

import { MyQuotasClient } from './components/MyQuotasClient'

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function MyQuotasSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="mt-2 h-5 w-96 rounded-lg" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      {/* Filter Tabs */}
      <Skeleton className="h-10 w-80 rounded-lg" />

      {/* Quota Cards */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────

async function MyQuotasContent() {
  const session = await getFullSession()

  const condominiums = session.condominiums ?? []

  // Any authenticated user with condominiums can access
  if (condominiums.length === 0) {
    redirect('/dashboard')
  }

  // Collect unit IDs from all condominiums the user has access to
  const unitIds = condominiums.flatMap((c) => c.units.map((u) => u.unit.id))

  if (unitIds.length === 0) {
    redirect('/dashboard')
  }

  return <MyQuotasClient unitIds={unitIds} userId={session.user.id} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function MyQuotasPage() {
  return (
    <Suspense fallback={<MyQuotasSkeleton />}>
      <MyQuotasContent />
    </Suspense>
  )
}
