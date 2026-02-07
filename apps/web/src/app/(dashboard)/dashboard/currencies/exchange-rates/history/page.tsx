import { Suspense } from 'react'

import { ExchangeRateHistoryTable } from './components/ExchangeRateHistoryTable'
import { ExchangeRateHistoryTableSkeleton } from './components/ExchangeRateHistoryTableSkeleton'

export default function ExchangeRateHistoryPage() {
  return (
    <Suspense fallback={<ExchangeRateHistoryTableSkeleton />}>
      <ExchangeRateHistoryTable />
    </Suspense>
  )
}
