import { Suspense } from 'react'

import { CompanySubscriptionDetails } from './components/CompanySubscriptionDetails'
import { CompanySubscriptionDetailsSkeleton } from './components/CompanySubscriptionDetailsSkeleton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanySubscriptionPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Suscripción</h3>
        <p className="text-sm text-default-500 mt-1">
          Gestiona la suscripción y plan personalizado de esta administradora
        </p>
      </div>

      <Suspense fallback={<CompanySubscriptionDetailsSkeleton />}>
        <CompanySubscriptionDetails companyId={id} />
      </Suspense>
    </div>
  )
}
