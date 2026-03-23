'use client'

import type { TReceiptListItem } from '@packages/http-client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { DatePicker } from '@/ui/components/date-picker'
import { Pagination } from '@/ui/components/pagination'
import { ClearFiltersButton } from '@/ui/components/filters'
import { Table, type ITableColumn } from '@/ui/components/table'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IMyReceiptsContentProps {
  receipts: TReceiptListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  currentFilters: {
    startDate: string
    endDate: string
  }
}

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'danger'> = {
  draft: 'default',
  generated: 'primary',
  sent: 'success',
  voided: 'danger',
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MyReceiptsContent({
  receipts,
  pagination,
  currentFilters,
}: IMyReceiptsContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }

      // Reset to page 1 when filters change (unless updating page itself)
      if (!('page' in updates)) {
        params.delete('page')
      }

      const query = params.toString()

      router.push(`${pathname}${query ? `?${query}` : ''}`)
    },
    [router, pathname, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const hasActiveFilters = currentFilters.startDate !== '' || currentFilters.endDate !== ''

  // Table columns
  const columns: ITableColumn<TReceiptListItem>[] = [
    { key: 'receiptNumber', label: t('resident.myReceipts.table.receiptNumber') },
    { key: 'period', label: t('resident.myReceipts.table.period'), width: 180 },
    {
      key: 'totalAmount',
      label: t('resident.myReceipts.table.totalAmount'),
      align: 'end',
      width: 180,
    },
    { key: 'status', label: t('resident.myReceipts.table.status'), align: 'center', width: 120 },
  ]

  const renderCell = useCallback(
    (receipt: TReceiptListItem, columnKey: string) => {
      switch (columnKey) {
        case 'receiptNumber':
          return (
            <Typography variant="body2" weight="semibold">
              {receipt.receiptNumber}
            </Typography>
          )
        case 'period':
          return (
            <Typography variant="body2">
              {MONTH_NAMES_ES[receipt.periodMonth - 1] ?? receipt.periodMonth} {receipt.periodYear}
            </Typography>
          )
        case 'totalAmount':
          return (
            <div className="text-right">
              <Typography variant="body2" weight="semibold">
                {receipt.currencySymbol ?? ''} {formatAmount(receipt.totalAmount)}
              </Typography>
            </div>
          )
        case 'status':
          return (
            <Chip color={STATUS_CHIP_COLOR[receipt.status] ?? 'default'} size="sm" variant="flat">
              {t(`resident.myReceipts.statuses.${receipt.status}`)}
            </Chip>
          )
        default:
          return null
      }
    },
    [t]
  )

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        <DatePicker
          className="w-44"
          label={t('resident.myReceipts.filter.startDate')}
          value={currentFilters.startDate}
          variant="bordered"
          onChange={value => {
            const ym = value ? value.substring(0, 7) : undefined

            updateParams({ startDate: ym })
          }}
        />

        <DatePicker
          className="w-44"
          label={t('resident.myReceipts.filter.endDate')}
          value={currentFilters.endDate}
          variant="bordered"
          onChange={value => {
            const ym = value ? value.substring(0, 7) : undefined

            updateParams({ endDate: ym })
          }}
        />

        {hasActiveFilters && <ClearFiltersButton onClear={clearFilters} />}
      </div>

      {/* Table or empty state */}
      {receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <FileSpreadsheet className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('resident.myReceipts.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('resident.myReceipts.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table
            aria-label={t('resident.myReceipts.title')}
            columns={columns}
            renderCell={renderCell}
            rows={receipts}
            onRowClick={receipt => router.push(`/dashboard/my-receipts/${receipt.id}`)}
          />

          {pagination.totalPages > 1 && (
            <Pagination
              limit={pagination.limit}
              page={pagination.page}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onLimitChange={limit => updateParams({ limit: String(limit), page: '1' })}
              onPageChange={page => updateParams({ page: String(page) })}
            />
          )}
        </>
      )}
    </div>
  )
}
