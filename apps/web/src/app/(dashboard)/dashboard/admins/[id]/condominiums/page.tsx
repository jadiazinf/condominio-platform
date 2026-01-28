import { Suspense } from 'react'

import { CompanyCondominiumsTable } from './components/CompanyCondominiumsTable'
import { CompanyCondominiumsTableSkeleton } from './components/CompanyCondominiumsTableSkeleton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyCondominiumsPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Condominios</h3>
        <p className="text-sm text-default-500 mt-1">
          Condominios gestionados por esta administradora
        </p>
      </div>

      <Suspense fallback={<CompanyCondominiumsTableSkeleton />}>
        <CompanyCondominiumsTable companyId={id} />
      </Suspense>
    </div>
  )
}
