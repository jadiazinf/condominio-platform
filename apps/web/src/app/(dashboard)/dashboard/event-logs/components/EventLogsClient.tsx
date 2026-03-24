'use client'

import type { TEventLog } from '@packages/domain'

import { useState, useMemo } from 'react'
import { Activity } from 'lucide-react'
import { useEventLogsPaginated, type IEventLogsQuery } from '@packages/http-client'

import { EventLogDetailModal } from './EventLogDetailModal'

import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Button } from '@/ui/components/button'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  table: {
    event: string
    category: string
    level: string
    message: string
    source: string
    result: string
    module: string
    duration: string
    date: string
  }
  filters: {
    category: string
    level: string
    result: string
    source: string
    dateFrom: string
    dateTo: string
    search: string
    clear: string
  }
  detail: {
    title: string
    action: string
    entityType: string
    entityId: string
    userId: string
    userRole: string
    errorCode: string
    errorMessage: string
    metadata: string
    ipAddress: string
    noMetadata: string
  }
  categories: Record<string, string>
  levels: Record<string, string>
  results: Record<string, string>
  sources: Record<string, string>
  empty: string
  emptyDescription: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  info: 'primary',
  warn: 'warning',
  error: 'danger',
  critical: 'danger',
}

const RESULT_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> =
  {
    success: 'success',
    failure: 'danger',
    partial: 'warning',
  }

type TEventLogRow = TEventLog & { id: string }

// ─── Component ───────────────────────────────────────────────────────────────

export function EventLogsClient({ translations: t }: { translations: ITranslations }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<TEventLog | null>(null)

  const query: IEventLogsQuery = {
    page,
    limit,
    ...(categoryFilter && { category: categoryFilter }),
    ...(levelFilter && { level: levelFilter }),
    ...(resultFilter && { result: resultFilter }),
    ...(sourceFilter && { source: sourceFilter }),
  }

  const { data, isLoading } = useEventLogsPaginated({ query })

  const logs: TEventLogRow[] = useMemo(
    () => (data?.data ?? []).map(log => ({ ...log, id: log.id })),
    [data]
  )
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 }

  const hasFilters = !!(categoryFilter || levelFilter || resultFilter || sourceFilter)

  const clearFilters = () => {
    setCategoryFilter('')
    setLevelFilter('')
    setResultFilter('')
    setSourceFilter('')
    setPage(1)
  }

  // Filter items
  const categoryItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t.filters.category },
      ...Object.entries(t.categories).map(([key, label]) => ({ key, label })),
    ],
    [t]
  )

  const levelItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t.filters.level },
      ...Object.entries(t.levels).map(([key, label]) => ({ key, label })),
    ],
    [t]
  )

  const resultItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t.filters.result },
      ...Object.entries(t.results).map(([key, label]) => ({ key, label })),
    ],
    [t]
  )

  const sourceItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t.filters.source },
      ...Object.entries(t.sources).map(([key, label]) => ({ key, label })),
    ],
    [t]
  )

  // Table columns
  const columns: ITableColumn<TEventLogRow>[] = [
    { key: 'createdAt', label: t.table.date, width: 160 },
    { key: 'level', label: t.table.level, width: 100, align: 'center' },
    { key: 'category', label: t.table.category, width: 130 },
    { key: 'event', label: t.table.event, width: 250 },
    { key: 'message', label: t.table.message },
    { key: 'source', label: t.table.source, width: 90, align: 'center' },
    { key: 'result', label: t.table.result, width: 90, align: 'center' },
    { key: 'durationMs', label: t.table.duration, width: 100, align: 'end' },
  ]

  const renderCell = (row: TEventLogRow, columnKey: string) => {
    switch (columnKey) {
      case 'createdAt':
        return (
          <span className="text-xs text-default-500">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        )
      case 'level':
        return (
          <Chip color={LEVEL_CHIP_COLOR[row.level] ?? 'default'} size="sm" variant="flat">
            {t.levels[row.level] ?? row.level}
          </Chip>
        )
      case 'category':
        return <span className="text-sm">{t.categories[row.category] ?? row.category}</span>
      case 'event':
        return <span className="text-sm font-mono text-default-600">{row.event}</span>
      case 'message':
        return <span className="text-sm text-default-500 line-clamp-2">{row.message}</span>
      case 'source':
        return (
          <Chip color="default" size="sm" variant="flat">
            {t.sources[row.source] ?? row.source}
          </Chip>
        )
      case 'result':
        return row.result ? (
          <Chip color={RESULT_CHIP_COLOR[row.result] ?? 'default'} size="sm" variant="flat">
            {t.results[row.result] ?? row.result}
          </Chip>
        ) : (
          <span className="text-default-300">-</span>
        )
      case 'durationMs':
        return row.durationMs != null ? (
          <span className="text-xs text-default-400">{row.durationMs}ms</span>
        ) : (
          <span className="text-default-300">-</span>
        )
      default:
        return String((row as Record<string, unknown>)[columnKey] ?? '')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Typography as="h1" variant="h2">
          {t.title}
        </Typography>
        <Typography as="p" className="text-default-500" variant="body1">
          {t.subtitle}
        </Typography>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={t.filters.category}
          className="w-full sm:w-40"
          items={categoryItems}
          size="lg"
          value={categoryFilter}
          variant="bordered"
          onChange={(key: string | null) => {
            setCategoryFilter(key ?? '')
            setPage(1)
          }}
        />
        <Select
          aria-label={t.filters.level}
          className="w-full sm:w-36"
          items={levelItems}
          size="lg"
          value={levelFilter}
          variant="bordered"
          onChange={(key: string | null) => {
            setLevelFilter(key ?? '')
            setPage(1)
          }}
        />
        <Select
          aria-label={t.filters.result}
          className="w-full sm:w-36"
          items={resultItems}
          size="lg"
          value={resultFilter}
          variant="bordered"
          onChange={(key: string | null) => {
            setResultFilter(key ?? '')
            setPage(1)
          }}
        />
        <Select
          aria-label={t.filters.source}
          className="w-full sm:w-36"
          items={sourceItems}
          size="lg"
          value={sourceFilter}
          variant="bordered"
          onChange={(key: string | null) => {
            setSourceFilter(key ?? '')
            setPage(1)
          }}
        />
        {hasFilters && (
          <Button size="sm" variant="light" onPress={clearFilters}>
            {t.filters.clear}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Activity className="text-default-300" size={48} />
          <Typography as="p" className="text-default-500" variant="body1">
            {t.empty}
          </Typography>
          <Typography as="p" className="text-default-400" variant="caption">
            {t.emptyDescription}
          </Typography>
        </div>
      ) : (
        <>
          <Table
            isCompact
            isStriped
            aria-label={t.title}
            columns={columns}
            renderCell={renderCell}
            rows={logs}
            onRowClick={row => setSelectedLog(row)}
          />

          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[20, 50, 100]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={newLimit => {
              setLimit(newLimit)
              setPage(1)
            }}
            onPageChange={setPage}
          />
        </>
      )}

      <EventLogDetailModal
        isOpen={!!selectedLog}
        log={selectedLog}
        translations={{
          title: t.detail.title,
          table: t.table,
          detail: t.detail,
          categories: t.categories,
          levels: t.levels,
          results: t.results,
          sources: t.sources,
        }}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
