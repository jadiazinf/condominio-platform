import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { getManagementCompanyById } from '@packages/http-client'
import { SESSION_COOKIE_NAME } from '@/libs/cookies'

import { CompanyCondominiumsTable } from './components/CompanyCondominiumsTable'
import { CompanyCondominiumsTableSkeleton } from './components/CompanyCondominiumsTableSkeleton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyCondominiumsPage({ params }: PageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || ''

  // Fetch company to check if it's active
  let isCompanyActive = true
  try {
    const company = await getManagementCompanyById(token, id)
    isCompanyActive = company.isActive
  } catch (error) {
    console.error('[CompanyCondominiumsPage] Error fetching company:', error)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Condominios</h3>
        <p className="text-sm text-default-500 mt-1">
          Condominios gestionados por esta administradora
        </p>
      </div>

      <Suspense fallback={<CompanyCondominiumsTableSkeleton />}>
        <CompanyCondominiumsTable companyId={id} isCompanyActive={isCompanyActive} />
      </Suspense>
    </div>
  )
}
