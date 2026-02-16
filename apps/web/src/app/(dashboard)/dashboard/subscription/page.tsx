import { Suspense } from 'react'

import { SubscriptionPage } from './components/SubscriptionPage'
import { SubscriptionPageSkeleton } from './components/SubscriptionPageSkeleton'

export default function SubscriptionPageRoute() {
  return (
    <Suspense fallback={<SubscriptionPageSkeleton />}>
      <SubscriptionPage />
    </Suspense>
  )
}
