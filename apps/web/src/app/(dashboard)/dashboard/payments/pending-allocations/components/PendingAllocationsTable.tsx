'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  FileCheck,
  Banknote,
  Eye,
  MoreVertical,
} from 'lucide-react'
import type { TPaymentPendingAllocation } from '@packages/domain'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Textarea } from '@/ui/components/textarea'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@/ui/components/modal'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { ClearFiltersButton } from '@/ui/components/filters'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  usePendingAllocations,
  allocatePending,
  refundPending,
  pendingAllocationKeys,
  paymentKeys,
  quotaKeys,
  useQueryClient,
  useQuotasPendingByUnit,
} from '@packages/http-client'

type TStatusFilter = 'all' | 'pending' | 'allocated' | 'refunded' | 'refund_pending' | 'refund_failed'

export function PendingAllocationsTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('pending')

  // Fetch data
  const { data, isLoading, error, refetch } = usePendingAllocations({
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const allocations = data?.data ?? []

  // Modal state
  const allocateModal = useDisclosure()
  const refundModal = useDisclosure()
  const [selectedAllocation, setSelectedAllocation] = useState<TPaymentPendingAllocation | null>(null)
  const [selectedQuotaId, setSelectedQuotaId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // We need to fetch pending quotas for the allocation's unit
  // For now we pass empty string until an allocation is selected
  const allocationPaymentUnitId = (selectedAllocation as any)?.payment?.unitId ?? ''
  const { data: pendingQuotasData } = useQuotasPendingByUnit(allocationPaymentUnitId, {
    enabled: !!allocationPaymentUnitId,
  })
  const pendingQuotas = pendingQuotasData?.data ?? []

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.payments.pendingAllocations.status.all') },
      { key: 'pending', label: t('admin.payments.pendingAllocations.status.pending') },
      { key: 'allocated', label: t('admin.payments.pendingAllocations.status.allocated') },
      { key: 'refunded', label: t('admin.payments.pendingAllocations.status.refunded') },
      { key: 'refund_pending', label: t('admin.payments.pendingAllocations.status.refund_pending') },
      { key: 'refund_failed', label: t('admin.payments.pendingAllocations.status.refund_failed') },
    ],
    [t]
  )

  const quotaSelectItems: ISelectItem[] = useMemo(
    () =>
      pendingQuotas.map((q) => {
        const period = q.periodMonth
          ? `${q.periodMonth}/${q.periodYear}`
          : `${q.periodYear}`
        return {
          key: q.id,
          label: `${period} — Saldo: ${parseFloat(q.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        }
      }),
    [pendingQuotas]
  )

  // Table columns
  const columns: ITableColumn<TPaymentPendingAllocation>[] = useMemo(
    () => [
      { key: 'payment', label: t('admin.payments.pendingAllocations.table.payment') },
      { key: 'amount', label: t('admin.payments.pendingAllocations.table.amount') },
      { key: 'status', label: t('admin.payments.pendingAllocations.table.status') },
      { key: 'createdAt', label: t('admin.payments.pendingAllocations.table.createdAt') },
      { key: 'actions', label: t('admin.payments.pendingAllocations.table.actions') },
    ],
    [t]
  )

  const formatAmount = (amount: string | null) => {
    if (!amount) return '-'
    const num = parseFloat(amount)
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: pendingAllocationKeys.all })
    queryClient.invalidateQueries({ queryKey: paymentKeys.all })
    queryClient.invalidateQueries({ queryKey: quotaKeys.all })
  }, [queryClient])

  // Handlers
  const handleAllocate = useCallback(async () => {
    if (!selectedAllocation || !selectedQuotaId) return

    setIsSubmitting(true)
    try {
      await allocatePending(selectedAllocation.id, {
        quotaId: selectedQuotaId,
        resolutionNotes: notes.trim() || null,
      })
      invalidateAll()
      toast.success(t('admin.payments.pendingAllocations.allocateModal.success'))
      allocateModal.onClose()
      setSelectedAllocation(null)
      setSelectedQuotaId('')
      setNotes('')
    } catch {
      toast.error(t('admin.payments.pendingAllocations.allocateModal.error'))
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedAllocation, selectedQuotaId, notes, invalidateAll, t, toast, allocateModal])

  const handleRefund = useCallback(async () => {
    if (!selectedAllocation || !notes.trim()) return

    setIsSubmitting(true)
    try {
      await refundPending(selectedAllocation.id, {
        resolutionNotes: notes.trim(),
      })
      invalidateAll()
      toast.success(t('admin.payments.pendingAllocations.refundModal.success'))
      refundModal.onClose()
      setSelectedAllocation(null)
      setNotes('')
    } catch {
      toast.error(t('admin.payments.pendingAllocations.refundModal.error'))
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedAllocation, notes, invalidateAll, t, toast, refundModal])

  const renderCell = useCallback(
    (alloc: TPaymentPendingAllocation, columnKey: string) => {
      switch (columnKey) {
        case 'payment':
          return (
            <span className="text-sm font-medium">
              {alloc.paymentId.slice(0, 8)}...
            </span>
          )
        case 'amount':
          return (
            <span className="text-sm font-medium">
              {formatAmount(alloc.pendingAmount)}
            </span>
          )
        case 'status':
          return (
            <Chip color={getAllocationStatusColor(alloc.status)} variant="flat" size="sm">
              {t(`admin.payments.pendingAllocations.status.${alloc.status}`)}
            </Chip>
          )
        case 'createdAt':
          return <span className="text-sm">{formatDate(alloc.createdAt)}</span>
        case 'actions': {
          const canAct = alloc.status === 'pending' || alloc.status === 'refund_failed'
          if (!canAct) return null
          return (
            <div onClick={e => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="light" size="sm">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Actions">
                  <DropdownItem
                    key="view"
                    startContent={<Eye size={16} />}
                    onPress={() => router.push(`/dashboard/payments/${alloc.paymentId}`)}
                  >
                    {t('admin.payments.pendingAllocations.actions.view')}
                  </DropdownItem>
                  <DropdownItem
                    key="allocate"
                    startContent={<FileCheck size={16} />}
                    onPress={() => {
                      setSelectedAllocation(alloc)
                      setNotes('')
                      setSelectedQuotaId('')
                      allocateModal.onOpen()
                    }}
                  >
                    {t('admin.payments.pendingAllocations.actions.allocate')}
                  </DropdownItem>
                  <DropdownItem
                    key="refund"
                    startContent={<Banknote size={16} />}
                    onPress={() => {
                      setSelectedAllocation(alloc)
                      setNotes('')
                      refundModal.onOpen()
                    }}
                  >
                    {t('admin.payments.pendingAllocations.actions.refund')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        }
        default:
          return null
      }
    },
    [t, router, allocateModal, refundModal]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.payments.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select
          aria-label={t('admin.payments.pendingAllocations.table.status')}
          className="w-full sm:w-48"
          items={statusFilterItems}
          value={statusFilter}
          onChange={(key) => key && setStatusFilter(key as TStatusFilter)}
          variant="bordered"
        />
        {statusFilter !== 'pending' && (
          <ClearFiltersButton onClear={() => setStatusFilter('pending')} />
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : allocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <AlertTriangle className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('admin.payments.pendingAllocations.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.payments.pendingAllocations.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <Table<TPaymentPendingAllocation>
          aria-label={t('admin.payments.pendingAllocations.title')}
          columns={columns}
          rows={allocations}
          renderCell={renderCell}
          onRowClick={(alloc) => router.push(`/dashboard/payments/${alloc.paymentId}`)}
          classNames={{
            tr: 'cursor-pointer transition-colors hover:bg-default-100',
          }}
        />
      )}

      {/* ── Modal: Allocate to Quota ──────────────────────────────────────── */}
      <Modal isOpen={allocateModal.isOpen} onOpenChange={allocateModal.onOpenChange} size="lg">
        <ModalContent>
          <ModalHeader>{t('admin.payments.pendingAllocations.allocateModal.title')}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {selectedAllocation && (
                <div className="rounded-md bg-default-100 p-3">
                  <Typography variant="body2" color="muted">
                    {t('admin.payments.pendingAllocations.table.amount')}
                  </Typography>
                  <Typography variant="h4">
                    {formatAmount(selectedAllocation.pendingAmount)}
                  </Typography>
                </div>
              )}

              <Select
                isRequired
                items={quotaSelectItems}
                label={t('admin.payments.pendingAllocations.allocateModal.selectQuota')}
                value={selectedQuotaId}
                onChange={(key) => setSelectedQuotaId(key ?? '')}
              />

              <Textarea
                label={t('admin.payments.pendingAllocations.allocateModal.notes')}
                placeholder={t('admin.payments.pendingAllocations.allocateModal.notesPlaceholder')}
                value={notes}
                onValueChange={setNotes}
                minRows={2}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={allocateModal.onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              isDisabled={!selectedQuotaId}
              isLoading={isSubmitting}
              onPress={handleAllocate}
            >
              {t('admin.payments.pendingAllocations.allocateModal.confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Modal: Refund ─────────────────────────────────────────────────── */}
      <Modal isOpen={refundModal.isOpen} onOpenChange={refundModal.onOpenChange} size="md">
        <ModalContent>
          <ModalHeader>{t('admin.payments.pendingAllocations.refundModal.title')}</ModalHeader>
          <ModalBody>
            <Textarea
              isRequired
              label={t('admin.payments.pendingAllocations.refundModal.notes')}
              placeholder={t('admin.payments.pendingAllocations.refundModal.notesPlaceholder')}
              value={notes}
              onValueChange={setNotes}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={refundModal.onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              color="warning"
              isDisabled={!notes.trim()}
              isLoading={isSubmitting}
              onPress={handleRefund}
            >
              {t('admin.payments.pendingAllocations.refundModal.confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAllocationStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'warning' as const
    case 'allocated': return 'success' as const
    case 'refunded': return 'default' as const
    case 'refund_pending': return 'secondary' as const
    case 'refund_failed': return 'danger' as const
    default: return 'default' as const
  }
}
