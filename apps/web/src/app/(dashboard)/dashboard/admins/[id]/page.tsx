import { Suspense } from 'react'

import { CompanyDetail } from './components/CompanyDetail'
import { CompanyDetailSkeleton } from './components/CompanyDetailSkeleton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyGeneralPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<CompanyDetailSkeleton />}>
      <CompanyDetail id={id} />
    </Suspense>
  )
}
