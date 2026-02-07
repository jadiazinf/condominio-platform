import { Suspense } from 'react'

import { CurrenciesTable } from './components/CurrenciesTable'
import { CurrenciesTableSkeleton } from './components/CurrenciesTableSkeleton'

export default function CurrenciesPage() {
  return (
    <Suspense fallback={<CurrenciesTableSkeleton />}>
      <CurrenciesTable />
    </Suspense>
  )
}
