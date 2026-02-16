import { Suspense } from 'react'

import { MyCompanyDetail } from './components/MyCompanyDetail'
import { MyCompanyDetailSkeleton } from './components/MyCompanyDetailSkeleton'

export default function MyCompanyPage() {
  return (
    <Suspense fallback={<MyCompanyDetailSkeleton />}>
      <MyCompanyDetail />
    </Suspense>
  )
}
