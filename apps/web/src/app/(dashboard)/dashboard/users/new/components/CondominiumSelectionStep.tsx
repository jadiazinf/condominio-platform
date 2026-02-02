'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { Input } from '@/ui/components/input'
import { Info, Search } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { Spinner } from '@/ui/components/spinner'
import { Table } from '@/ui/components/table'
import { Pagination } from '@/ui/components/pagination'

interface ICondominium {
  id: string
  name: string
  code: string | null
  address: string | null
}

interface CondominiumSelectionStepProps {
  condominiums: ICondominium[]
  isLoading: boolean
  translateError: (message: string | undefined) => string | undefined
  page: number
  limit: number
  total: number
  totalPages: number
  search: string
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSearchChange: (search: string) => void
}

function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <Typography variant="subtitle1" className="font-semibold">
        {title}
      </Typography>
      <Tooltip
        content={tooltip}
        placement="right"
        showArrow
        classNames={{
          content: 'max-w-xs text-sm',
        }}
      >
        <Info className="h-4 w-4 text-default-400 cursor-help" />
      </Tooltip>
    </div>
  )
}

export function CondominiumSelectionStep({
  condominiums,
  isLoading,
  translateError,
  page,
  limit,
  total,
  totalPages,
  search,
  onPageChange,
  onLimitChange,
  onSearchChange,
}: CondominiumSelectionStepProps) {
  const { t } = useTranslation()
  const {
    control,
    formState: { errors },
  } = useFormContext()

  const columns = [
    { key: 'name', label: t('superadmin.users.create.condominium.table.name') },
    { key: 'code', label: t('superadmin.users.create.condominium.table.code') },
    { key: 'address', label: t('superadmin.users.create.condominium.table.address') },
  ]

  const renderCell = (row: ICondominium, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return (
          <Typography variant="body2" className="font-medium">
            {row.name}
          </Typography>
        )
      case 'code':
        return (
          <Typography color="muted" variant="body2">
            {row.code || '-'}
          </Typography>
        )
      case 'address':
        return (
          <Typography color="muted" variant="body2">
            {row.address || '-'}
          </Typography>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('superadmin.users.create.condominium.title')}
        tooltip={t('superadmin.users.create.condominium.tooltip')}
      />

      {/* Search Filter */}
      <Input
        placeholder={t('superadmin.users.create.condominium.searchPlaceholder')}
        startContent={<Search className="h-4 w-4 text-default-400" />}
        value={search}
        onValueChange={onSearchChange}
        className="max-w-md"
      />

      {/* Condominiums Table */}
      <Controller
        control={control}
        name="condominiumId"
        render={({ field }) => (
          <div className="rounded-lg border border-default-200">
            <Table
              aria-label="Condominiums table"
              columns={columns}
              rows={condominiums}
              renderCell={renderCell}
              selectionMode="single"
              selectedKeys={field.value ? new Set([field.value]) : new Set()}
              onSelectionChange={keys => {
                const selectedKey = Array.from(keys)[0]
                field.onChange(selectedKey || '')
              }}
              emptyContent={t('superadmin.users.create.condominium.empty')}
              removeWrapper
            />
          </div>
        )}
      />

      {/* Pagination */}
      {!isLoading && condominiums.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages || 1}
          total={total || condominiums.length}
          limit={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}

      {errors.condominiumId && (
        <Typography color="danger" variant="body2">
          {translateError(errors.condominiumId.message as string)}
        </Typography>
      )}
    </div>
  )
}
