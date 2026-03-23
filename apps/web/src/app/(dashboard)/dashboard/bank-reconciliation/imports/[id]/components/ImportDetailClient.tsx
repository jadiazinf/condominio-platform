'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, Link2, Link2Off, EyeOff } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import {
  useBankStatementEntries,
  useAutoMatch,
  useManualMatch,
  useUnmatchEntry,
  useIgnoreEntry,
  type IBankStatementEntry,
} from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { useToast } from '@/ui/components/toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  backToList: string
  summary: string
  totalEntries: string
  totalCredits: string
  totalDebits: string
  matched: string
  unmatched: string
  ignored: string
  autoMatch: string
  autoMatching: string
  autoMatchSuccess: string
  autoMatchError: string
  table: {
    date: string
    reference: string
    description: string
    amount: string
    type: string
    status: string
    actions: string
  }
  entryTypes: { credit: string; debit: string }
  entryStatuses: { unmatched: string; matched: string; ignored: string }
  actions: { match: string; unmatch: string; ignore: string }
  matchDialog: {
    title: string
    subtitle: string
    searchPlaceholder: string
    noResults: string
    selectPayment: string
    paymentRef: string
    paymentAmount: string
    paymentDate: string
    matching: string
    matchSuccess: string
    matchError: string
  }
  unmatchSuccess: string
  unmatchError: string
  ignoreSuccess: string
  ignoreError: string
}

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  unmatched: 'warning',
  matched: 'success',
  ignored: 'default',
}

const TYPE_CHIP_COLOR: Record<string, 'success' | 'danger'> = {
  credit: 'success',
  debit: 'danger',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportDetailClient({
  importId,
  translations: t,
}: {
  importId: string
  translations: ITranslations
}) {
  const router = useRouter()
  const toast = useToast()

  // Data hooks
  const { data: entriesData, isLoading, refetch } = useBankStatementEntries(importId)
  const entries: IBankStatementEntry[] = entriesData?.data ?? []

  // Mutation hooks
  const autoMatchMutation = useAutoMatch()
  const manualMatchMutation = useManualMatch()
  const unmatchMutation = useUnmatchEntry()
  const ignoreMutation = useIgnoreEntry()

  // Match dialog state
  const [matchingEntryId, setMatchingEntryId] = useState<string | null>(null)
  const [paymentIdInput, setPaymentIdInput] = useState('')

  // Stats
  const totalEntries = entries.length
  const totalCredits = entries
    .filter(e => e.entryType === 'credit')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalDebits = entries
    .filter(e => e.entryType === 'debit')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const matchedCount = entries.filter(e => e.status === 'matched').length
  const unmatchedCount = entries.filter(e => e.status === 'unmatched').length
  const ignoredCount = entries.filter(e => e.status === 'ignored').length

  // Actions
  const handleAutoMatch = useCallback(async () => {
    try {
      const result = await autoMatchMutation.mutateAsync({ importId })
      const data = result.data?.data

      toast.success(
        t.autoMatchSuccess
          .replace('{{matched}}', String(data?.matched ?? 0))
          .replace('{{unmatched}}', String(data?.unmatched ?? 0))
      )
      refetch()
    } catch {
      toast.error(t.autoMatchError)
    }
  }, [autoMatchMutation, importId, toast, t, refetch])

  const handleManualMatch = useCallback(
    async (entryId: string, paymentId: string) => {
      try {
        await manualMatchMutation.mutateAsync({ entryId, paymentId })
        toast.success(t.matchDialog.matchSuccess)
        setMatchingEntryId(null)
        setPaymentIdInput('')
        refetch()
      } catch {
        toast.error(t.matchDialog.matchError)
      }
    },
    [manualMatchMutation, toast, t, refetch]
  )

  const handleUnmatch = useCallback(
    async (entryId: string) => {
      try {
        await unmatchMutation.mutateAsync({ entryId })
        toast.success(t.unmatchSuccess)
        refetch()
      } catch {
        toast.error(t.unmatchError)
      }
    },
    [unmatchMutation, toast, t, refetch]
  )

  const handleIgnore = useCallback(
    async (entryId: string) => {
      try {
        await ignoreMutation.mutateAsync({ entryId })
        toast.success(t.ignoreSuccess)
        refetch()
      } catch {
        toast.error(t.ignoreError)
      }
    },
    [ignoreMutation, toast, t, refetch]
  )

  // Table configuration
  type TEntryRow = (typeof entries)[number] & { id: string }
  const rows: TEntryRow[] = entries.map(e => ({ ...e, id: e.id }))

  const columns: ITableColumn<TEntryRow>[] = [
    { key: 'date', label: t.table.date, width: 110 },
    { key: 'reference', label: t.table.reference, width: 140 },
    { key: 'description', label: t.table.description },
    { key: 'amount', label: t.table.amount, width: 120, align: 'end' as const },
    { key: 'type', label: t.table.type, width: 90, align: 'center' as const },
    { key: 'status', label: t.table.status, width: 120 },
    { key: 'actions', label: t.table.actions, width: 200 },
  ]

  const renderCell = (row: TEntryRow, key: string | number | symbol) => {
    switch (String(key)) {
      case 'date':
        return new Date(row.transactionDate).toLocaleDateString()
      case 'reference':
        return <span className="font-mono text-xs">{row.reference ?? '-'}</span>
      case 'description':
        return (
          <span className="line-clamp-1 text-sm" title={row.description ?? ''}>
            {row.description ?? '-'}
          </span>
        )
      case 'amount':
        return (
          <span
            className={`font-semibold ${row.entryType === 'credit' ? 'text-green-600' : 'text-red-600'}`}
          >
            {row.entryType === 'debit' ? '-' : ''}
            {formatAmount(row.amount)}
          </span>
        )
      case 'type':
        return (
          <Chip color={TYPE_CHIP_COLOR[row.entryType] ?? 'default'} size="sm">
            {t.entryTypes[row.entryType as keyof typeof t.entryTypes] ?? row.entryType}
          </Chip>
        )
      case 'status':
        return (
          <Chip color={STATUS_CHIP_COLOR[row.status] ?? 'default'} size="sm">
            {t.entryStatuses[row.status as keyof typeof t.entryStatuses] ?? row.status}
          </Chip>
        )
      case 'actions':
        return (
          <div className="flex gap-1">
            {row.status === 'unmatched' && (
              <>
                <Button
                  color="primary"
                  size="sm"
                  startContent={<Link2 className="h-3 w-3" />}
                  variant="flat"
                  onPress={() => setMatchingEntryId(row.id)}
                >
                  {t.actions.match}
                </Button>
                <Button
                  isLoading={ignoreMutation.isPending}
                  size="sm"
                  startContent={<EyeOff className="h-3 w-3" />}
                  variant="flat"
                  onPress={() => handleIgnore(row.id)}
                >
                  {t.actions.ignore}
                </Button>
              </>
            )}
            {row.status === 'matched' && (
              <Button
                color="warning"
                isLoading={unmatchMutation.isPending}
                size="sm"
                startContent={<Link2Off className="h-3 w-3" />}
                variant="flat"
                onPress={() => handleUnmatch(row.id)}
              >
                {t.actions.unmatch}
              </Button>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            className="mb-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"
            onClick={() => router.push('/dashboard/bank-reconciliation')}
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backToList}
          </button>
          <Typography variant="h2">{t.title}</Typography>
          <Typography className="mt-1" color="muted">
            {t.subtitle}
          </Typography>
        </div>
        <Button
          color="primary"
          isDisabled={unmatchedCount === 0}
          isLoading={autoMatchMutation.isPending}
          startContent={<Zap className="h-4 w-4" />}
          onPress={handleAutoMatch}
        >
          {autoMatchMutation.isPending ? t.autoMatching : t.autoMatch}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-default-200 p-3 text-center">
          <Typography className="text-xs" color="muted">
            {t.totalEntries}
          </Typography>
          <Typography className="text-lg font-bold">{totalEntries}</Typography>
        </div>
        <div className="rounded-lg border border-default-200 p-3 text-center">
          <Typography className="text-xs" color="muted">
            {t.totalCredits}
          </Typography>
          <Typography className="text-lg font-bold text-green-600">
            {formatAmount(String(totalCredits))}
          </Typography>
        </div>
        <div className="rounded-lg border border-default-200 p-3 text-center">
          <Typography className="text-xs" color="muted">
            {t.totalDebits}
          </Typography>
          <Typography className="text-lg font-bold text-red-600">
            {formatAmount(String(totalDebits))}
          </Typography>
        </div>
        <div className="rounded-lg border border-success-200 bg-success-50/30 p-3 text-center">
          <Typography className="text-xs" color="muted">
            {t.matched}
          </Typography>
          <Typography className="text-lg font-bold text-success">{matchedCount}</Typography>
        </div>
        <div className="rounded-lg border border-warning-200 bg-warning-50/30 p-3 text-center">
          <Typography className="text-xs" color="muted">
            {t.unmatched}
          </Typography>
          <Typography className="text-lg font-bold text-warning">{unmatchedCount}</Typography>
        </div>
        <div className="rounded-lg border border-default-200 p-3 text-center">
          <Typography className="text-xs" color="muted">
            {t.ignored}
          </Typography>
          <Typography className="text-lg font-bold text-default-400">{ignoredCount}</Typography>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Entries table */}
      {!isLoading && rows.length > 0 && (
        <Table
          fullWidth
          aria-label="bank-statement-entries"
          columns={columns}
          renderCell={renderCell}
          rows={rows}
        />
      )}

      {/* Manual match dialog (inline) */}
      {matchingEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Typography className="mb-1" variant="h3">
              {t.matchDialog.title}
            </Typography>
            <Typography className="mb-4 text-sm" color="muted">
              {t.matchDialog.subtitle}
            </Typography>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium" htmlFor="payment-id-input">
                Payment ID
              </label>
              <input
                className="w-full rounded-lg border border-default-300 px-3 py-2 text-sm"
                id="payment-id-input"
                placeholder={t.matchDialog.searchPlaceholder}
                value={paymentIdInput}
                onChange={e => setPaymentIdInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="flat"
                onPress={() => {
                  setMatchingEntryId(null)
                  setPaymentIdInput('')
                }}
              >
                Cancelar
              </Button>
              <Button
                color="primary"
                isDisabled={!paymentIdInput.trim()}
                isLoading={manualMatchMutation.isPending}
                onPress={() => handleManualMatch(matchingEntryId, paymentIdInput.trim())}
              >
                {t.matchDialog.selectPayment}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
