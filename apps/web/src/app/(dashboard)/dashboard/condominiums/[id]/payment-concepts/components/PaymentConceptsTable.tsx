'use client'

import { useMemo, useCallback } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { FileText } from 'lucide-react'
import type { TPaymentConcept } from '@packages/domain'

const TYPE_COLORS = {
  maintenance: 'primary',
  condominium_fee: 'secondary',
  extraordinary: 'warning',
  fine: 'danger',
  other: 'default',
} as const

interface PaymentConceptsTableProps {
  paymentConcepts: TPaymentConcept[]
  onRowClick?: (concept: TPaymentConcept) => void
  translations: {
    title: string
    subtitle: string
    empty: string
    emptyDescription: string
    table: {
      name: string
      type: string
      recurring: string
      recurrence: string
      status: string
    }
    types: {
      maintenance: string
      condominium_fee: string
      extraordinary: string
      fine: string
      other: string
    }
    recurrence: {
      monthly: string
      quarterly: string
      yearly: string
    }
    yes: string
    no: string
    status: {
      active: string
      inactive: string
    }
  }
}

export function PaymentConceptsTable({ paymentConcepts, onRowClick, translations: t }: PaymentConceptsTableProps) {
  const columns: ITableColumn<TPaymentConcept>[] = useMemo(
    () => [
      { key: 'name', label: t.table.name },
      { key: 'type', label: t.table.type },
      { key: 'recurring', label: t.table.recurring },
      { key: 'recurrence', label: t.table.recurrence },
      { key: 'status', label: t.table.status },
    ],
    [t]
  )

  const renderCell = useCallback(
    (concept: TPaymentConcept, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{concept.name}</span>
              {concept.description && (
                <span className="text-xs text-default-500 line-clamp-1">{concept.description}</span>
              )}
            </div>
          )
        case 'type':
          return (
            <Chip
              color={TYPE_COLORS[concept.conceptType as keyof typeof TYPE_COLORS] || 'default'}
              variant="flat"
              size="sm"
            >
              {t.types[concept.conceptType as keyof typeof t.types] || concept.conceptType}
            </Chip>
          )
        case 'recurring':
          return (
            <Chip
              color={concept.isRecurring ? 'success' : 'default'}
              variant="flat"
              size="sm"
            >
              {concept.isRecurring ? t.yes : t.no}
            </Chip>
          )
        case 'recurrence':
          return concept.recurrencePeriod ? (
            <span className="text-sm text-default-600">
              {t.recurrence[concept.recurrencePeriod as keyof typeof t.recurrence] || concept.recurrencePeriod}
            </span>
          ) : (
            <span className="text-sm text-default-400">-</span>
          )
        case 'status':
          return (
            <Chip
              color={concept.isActive ? 'success' : 'default'}
              variant="flat"
              size="sm"
            >
              {concept.isActive ? t.status.active : t.status.inactive}
            </Chip>
          )
        default:
          return null
      }
    },
    [t]
  )

  if (paymentConcepts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <FileText className="mb-4 text-default-300" size={48} />
        <Typography color="muted" variant="body1">
          {t.empty}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t.emptyDescription}
        </Typography>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile Cards */}
      <div className="block space-y-3 md:hidden">
        {paymentConcepts.map(concept => (
          <Card
            key={concept.id}
            className={`w-full${onRowClick ? ' cursor-pointer hover:bg-default-100 transition-colors' : ''}`}
            isPressable={!!onRowClick}
            onPress={() => onRowClick?.(concept)}
          >
            <CardBody className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{concept.name}</p>
                  {concept.description && (
                    <p className="text-xs text-default-500 line-clamp-2">{concept.description}</p>
                  )}
                </div>
                <Chip
                  color={concept.isActive ? 'success' : 'default'}
                  variant="flat"
                  size="sm"
                >
                  {concept.isActive ? t.status.active : t.status.inactive}
                </Chip>
              </div>
              <div className="flex items-center gap-2">
                <Chip
                  color={TYPE_COLORS[concept.conceptType as keyof typeof TYPE_COLORS] || 'default'}
                  variant="flat"
                  size="sm"
                >
                  {t.types[concept.conceptType as keyof typeof t.types] || concept.conceptType}
                </Chip>
                {concept.isRecurring && concept.recurrencePeriod && (
                  <span className="text-xs text-default-500">
                    {t.recurrence[concept.recurrencePeriod as keyof typeof t.recurrence]}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table<TPaymentConcept>
          aria-label={t.title}
          columns={columns}
          rows={paymentConcepts}
          renderCell={renderCell}
          onRowClick={onRowClick}
          classNames={onRowClick ? { tr: 'cursor-pointer hover:bg-default-100 transition-colors' } : undefined}
        />
      </div>
    </div>
  )
}
