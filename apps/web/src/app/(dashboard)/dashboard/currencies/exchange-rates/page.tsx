import { Suspense } from 'react'

import { CurrentRatesTable } from './components/CurrentRatesTable'
import { CurrentRatesTableSkeleton } from './components/CurrentRatesTableSkeleton'

export default function ExchangeRatesPage() {
  return (
    <Suspense fallback={<CurrentRatesTableSkeleton />}>
      <CurrentRatesTable />
    </Suspense>
  )
}
