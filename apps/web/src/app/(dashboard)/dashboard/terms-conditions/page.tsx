import { Suspense } from 'react'

import { TermsTable } from './components/TermsTable'
import { TermsTableSkeleton } from './components/TermsTableSkeleton'

export default function TermsConditionsPage() {
  return (
    <Suspense fallback={<TermsTableSkeleton />}>
      <TermsTable />
    </Suspense>
  )
}
