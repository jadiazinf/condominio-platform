import { Suspense } from 'react'

import { CompanyMembersTable } from './components/CompanyMembersTable'
import { CompanyMembersTableSkeleton } from './components/CompanyMembersTableSkeleton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyMembersPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Miembros del Equipo</h3>
        <p className="text-sm text-default-500 mt-1">
          Gestiona los miembros y permisos de esta administradora
        </p>
      </div>

      <Suspense fallback={<CompanyMembersTableSkeleton />}>
        <CompanyMembersTable companyId={id} />
      </Suspense>
    </div>
  )
}
