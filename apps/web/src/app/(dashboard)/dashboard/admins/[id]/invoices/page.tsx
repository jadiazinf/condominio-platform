import { Suspense } from 'react'

import { CompanyInvoicesTable, CompanyInvoicesTableSkeleton } from './components'

interface InvoicesPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InvoicesPage({ params }: InvoicesPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">
          Historial de Pagos
        </h1>
        <p className="mt-2 text-sm text-default-500">
          Gestiona las facturas de suscripción de la administradora
        </p>
      </div>

      <Suspense fallback={<CompanyInvoicesTableSkeleton />}>
        <CompanyInvoicesTable companyId={id} />
      </Suspense>
    </div>
  )
}
