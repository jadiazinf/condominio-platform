'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { TManagementCompany } from '@packages/domain'
import { Table, type ITableColumn } from '@/ui/components/table'
import { useTranslation } from '@/contexts'

type TRow = TManagementCompany & { id: string }

interface ManagementCompaniesTableProps {
  companies: TManagementCompany[]
}

export function ManagementCompaniesTable({ companies }: ManagementCompaniesTableProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const columns: ITableColumn<TRow>[] = [
    { key: 'name', label: t('superadmin.condominiums.detail.general.companyName') },
    { key: 'email', label: t('superadmin.condominiums.detail.general.companyEmail') },
  ]

  const renderCell = useCallback(
    (company: TManagementCompany, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return <span className="font-medium">{company.name}</span>
        case 'email':
          return <span className="text-default-600">{company.email || '-'}</span>
        default:
          return null
      }
    },
    []
  )

  const handleRowClick = useCallback(
    (company: TManagementCompany) => {
      router.push(`/dashboard/admins/${company.id}`)
    },
    [router]
  )

  return (
    <Table<TRow>
      aria-label={t('superadmin.condominiums.detail.general.managementCompanies')}
      columns={columns}
      rows={companies}
      renderCell={renderCell}
      onRowClick={handleRowClick}
      classNames={{
        tr: 'cursor-pointer transition-colors hover:bg-default-100',
      }}
    />
  )
}
