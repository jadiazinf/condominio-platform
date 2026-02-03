import { Suspense } from 'react'
import { CompanyActions } from './components/CompanyActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyActionsPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded bg-default-200" />}>
      <CompanyActions companyId={id} />
    </Suspense>
  )
}
