'use client'

import type { TQuota } from '@packages/domain'
import type { IGenerateAllMissingQuotasResult } from '@packages/http-client/hooks'

import { useState } from 'react'
import {
  useQuotasByUnitPaginated,
  useCancelQuota,
  useDistinctConceptsByUnit,
  useGenerateMissingQuota,
  useGenerateAllMissingQuotas,
} from '@packages/http-client/hooks'
import { X, Ban, Plus, Eye, CalendarDays } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'

import { ConceptPreviewPanel, type ConceptPreviewTranslations } from './ConceptPreviewPanel'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { DatePicker } from '@/ui/components/date-picker'
import { Select } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { Textarea } from '@/ui/components/textarea'
import { Input } from '@/ui/components/input'
import { useToast } from '@/ui/components/toast'
import { Switch } from '@/ui/components/switch'

export interface AllQuotasModalTranslations {
  title: string
  filters: {
    dateFrom: string
    dateTo: string
    status: string
    allStatuses: string
    clear: string
  }
  table: {
    concept: string
    period: string
    amount: string
    paid: string
    balance: string
    status: string
  }
  statuses: Record<string, string>
  noResults: string
  actions?: {
    cancel: string
    cancelTitle: string
    cancelWarning: string
    cancelReasonLabel: string
    cancelReasonPlaceholder: string
    cancelReasonMinLength: string
    confirmCancel: string
    cancelSuccess: string
    cancelError: string
    close: string
    generate: string
    generateTitle: string
    generateDescription: string
    generateConcept: string
    generateConceptPlaceholder: string
    generateYear: string
    generateMonth: string
    generateMonthPlaceholder: string
    confirmGenerate: string
    generateSuccess: string
    generateError: string
    noConceptsAvailable: string
    generateModeAll: string
    generateModeSingle: string
    generateAllDescription: string
    generateAllSuccess: string
    generateResultCreated: string
    generateResultSkipped: string
    generateResultFailed: string
    conceptPreview: ConceptPreviewTranslations
  }
}

interface AllQuotasModalProps {
  isOpen: boolean
  onClose: () => void
  unitId: string
  translations: AllQuotasModalTranslations
}

const ITEMS_PER_PAGE = 10

type TQuotaRow = TQuota & { id: string }

const quotaStatusColors: Record<
  string,
  'success' | 'warning' | 'danger' | 'default' | 'secondary' | 'primary'
> = {
  paid: 'success',
  pending: 'warning',
  partial: 'primary',
  overdue: 'danger',
  cancelled: 'default',
  exonerated: 'secondary',
}

const CANCELLABLE_STATUSES = new Set(['pending', 'partial', 'overdue'])

export function AllQuotasModal({ isOpen, onClose, unitId, translations: t }: AllQuotasModalProps) {
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('pending')
  const [cancellingQuotaId, setCancellingQuotaId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const toast = useToast()

  const cancelMutation = useCancelQuota(cancellingQuotaId ?? '', {
    onSuccess: () => {
      toast.success(t.actions?.cancelSuccess ?? 'Cuota cancelada')
      setCancellingQuotaId(null)
      setCancelReason('')
    },
    onError: () => {
      toast.error(t.actions?.cancelError ?? 'Error al cancelar')
    },
  })

  const handleCancelConfirm = () => {
    if (cancelReason.length < 10) return
    cancelMutation.mutate({ reason: cancelReason })
  }

  // Concept preview state
  const [showConceptPreview, setShowConceptPreview] = useState(false)

  // Generate quota state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateMode, setGenerateMode] = useState<'all' | 'single'>('all')
  const [generateConceptId, setGenerateConceptId] = useState('')
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear())
  const [generateMonth, setGenerateMonth] = useState(0)
  const [generateResult, setGenerateResult] = useState<IGenerateAllMissingQuotasResult | null>(null)

  const { data: conceptsData } = useDistinctConceptsByUnit(unitId, { enabled: isOpen })
  const concepts = conceptsData?.data ?? []

  const generateMutation = useGenerateMissingQuota(unitId, {
    onSuccess: () => {
      toast.success(t.actions?.generateSuccess ?? 'Cuota generada')
      setShowGenerateModal(false)
      resetGenerateForm()
    },
    onError: () => {
      toast.error(t.actions?.generateError ?? 'Error al generar')
    },
  })

  const generateAllMutation = useGenerateAllMissingQuotas(unitId, {
    onSuccess: response => {
      const data = response.data.data

      setGenerateResult(data)
      if (data.created.length > 0) {
        toast.success(
          t.actions?.generateAllSuccess ?? `${data.created.length} cuota(s) generada(s)`
        )
      }
    },
    onError: () => {
      toast.error(t.actions?.generateError ?? 'Error al generar')
    },
  })

  const resetGenerateForm = () => {
    setGenerateMode('all')
    setGenerateConceptId('')
    setGenerateYear(new Date().getFullYear())
    setGenerateMonth(0)
    setGenerateResult(null)
  }

  const handleGenerateConfirm = () => {
    if (!generateConceptId) return

    if (generateMode === 'all') {
      generateAllMutation.mutate({
        paymentConceptId: generateConceptId,
        periodYear: generateYear,
      })
    } else {
      if (!generateMonth) return
      generateMutation.mutate({
        paymentConceptId: generateConceptId,
        periodYear: generateYear,
        periodMonth: generateMonth,
      })
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    key: String(i + 1),
    label: new Date(2000, i).toLocaleDateString('es-VE', { month: 'long' }),
  }))

  const { data, isLoading } = useQuotasByUnitPaginated({
    query: {
      unitId,
      page,
      limit: ITEMS_PER_PAGE,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
    },
    enabled: isOpen,
  })

  const quotas = data?.data ?? []
  const pagination = data?.pagination

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatus('')
    setPage(1)
  }

  const hasFilters = startDate || endDate || status

  const columns: ITableColumn<TQuotaRow>[] = [
    { key: 'concept', label: t.table.concept },
    { key: 'period', label: t.table.period },
    { key: 'amount', label: t.table.amount, align: 'end' },
    { key: 'paid', label: t.table.paid, align: 'end' },
    { key: 'balance', label: t.table.balance, align: 'end' },
    { key: 'status', label: t.table.status },
    ...(t.actions ? [{ key: 'actions' as const, label: '', width: 50 }] : []),
  ]

  const renderCell = (quota: TQuota, columnKey: string) => {
    const sym = quota.currency?.symbol || quota.currency?.code || '$'

    switch (columnKey) {
      case 'concept':
        return quota.paymentConcept?.name || quota.periodDescription || '-'
      case 'period': {
        if (quota.periodMonth) {
          const monthName = new Date(quota.periodYear, quota.periodMonth - 1).toLocaleDateString(
            'es-VE',
            { month: 'short' }
          )

          return `${monthName} ${quota.periodYear}`
        }

        return quota.periodDescription || `${quota.periodYear}`
      }
      case 'amount':
        return `${sym} ${formatAmount(quota.baseAmount)}`
      case 'paid':
        return `${sym} ${formatAmount(quota.paidAmount)}`
      case 'balance':
        return (
          <span className={parseFloat(quota.balance) > 0 ? 'text-danger font-medium' : ''}>
            {sym} {formatAmount(quota.balance)}
          </span>
        )
      case 'status':
        return (
          <Chip color={quotaStatusColors[quota.status] || 'default'} size="sm" variant="flat">
            {t.statuses[quota.status] || quota.status}
          </Chip>
        )
      case 'actions':
        if (!CANCELLABLE_STATUSES.has(quota.status)) return null

        return (
          <Button
            color="danger"
            size="sm"
            title={t.actions?.cancel ?? 'Cancelar'}
            variant="light"
            onPress={() => setCancellingQuotaId(quota.id)}
          >
            <Ban size={14} />
          </Button>
        )
      default:
        return null
    }
  }

  const statusOptions = [
    { label: t.filters.allStatuses, value: '' },
    { label: t.statuses.pending || 'Pendiente', value: 'pending' },
    { label: t.statuses.partial || 'Parcial', value: 'partial' },
    { label: t.statuses.paid || 'Pagado', value: 'paid' },
    { label: t.statuses.overdue || 'Vencido', value: 'overdue' },
    { label: t.statuses.cancelled || 'Cancelado', value: 'cancelled' },
    { label: t.statuses.exonerated || 'Exonerada', value: 'exonerated' },
  ]

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="4xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t.title}</Typography>
        </ModalHeader>
        <ModalBody className="pb-6">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <DatePicker
              label={t.filters.dateFrom}
              value={startDate}
              onChange={v => {
                setStartDate(v)
                setPage(1)
              }}
            />
            <DatePicker
              label={t.filters.dateTo}
              value={endDate}
              onChange={v => {
                setEndDate(v)
                setPage(1)
              }}
            />
            <Select
              items={statusOptions.map(o => ({ key: o.value, label: o.label }))}
              label={t.filters.status}
              selectedKeys={status ? [status] : []}
              onChange={key => {
                setStatus(key ?? '')
                setPage(1)
              }}
            />
            {hasFilters && (
              <Button
                className="self-end"
                size="sm"
                startContent={<X size={14} />}
                variant="light"
                onPress={handleClearFilters}
              >
                {t.filters.clear}
              </Button>
            )}
            {t.actions && (
              <Button
                className="self-end"
                color="primary"
                startContent={<Plus size={14} />}
                variant="flat"
                onPress={() => setShowGenerateModal(true)}
              >
                {t.actions.generate ?? 'Generar cuota'}
              </Button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : quotas.length === 0 ? (
            <Typography className="py-8 text-center" color="muted" variant="body2">
              {t.noResults}
            </Typography>
          ) : (
            <>
              <Table<TQuotaRow>
                aria-label={t.title}
                classNames={{
                  wrapper: 'shadow-none border-none p-0',
                  tr: 'hover:bg-default-50',
                }}
                columns={columns}
                renderCell={renderCell}
                rows={quotas}
              />
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    limit={pagination.limit}
                    page={pagination.page}
                    showLimitSelector={false}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>

      {/* Cancel confirmation modal */}
      {cancellingQuotaId && (
        <Modal
          isOpen={!!cancellingQuotaId}
          onClose={() => {
            setCancellingQuotaId(null)
            setCancelReason('')
          }}
        >
          <ModalContent>
            <ModalHeader>
              <Typography variant="h4">{t.actions?.cancelTitle ?? 'Cancelar Cuota'}</Typography>
            </ModalHeader>
            <ModalBody>
              <Typography className="mb-4" color="muted" variant="body2">
                {t.actions?.cancelWarning ??
                  'Esta acción cancelará la cuota y no se puede revertir. Se creará un registro de auditoría.'}
              </Typography>
              <Textarea
                label={t.actions?.cancelReasonLabel ?? 'Razón de cancelación'}
                minRows={3}
                placeholder={
                  t.actions?.cancelReasonPlaceholder ?? 'Explica por qué se cancela esta cuota...'
                }
                value={cancelReason}
                onValueChange={setCancelReason}
              />
              {cancelReason.length > 0 && cancelReason.length < 10 && (
                <Typography color="danger" variant="caption">
                  {t.actions?.cancelReasonMinLength ?? 'La razón debe tener al menos 10 caracteres'}
                </Typography>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  setCancellingQuotaId(null)
                  setCancelReason('')
                }}
              >
                {t.actions?.close ?? 'Cerrar'}
              </Button>
              <Button
                color="danger"
                isDisabled={cancelReason.length < 10}
                isLoading={cancelMutation.isPending}
                onPress={handleCancelConfirm}
              >
                {t.actions?.confirmCancel ?? 'Confirmar cancelación'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Generate quota modal */}
      {showGenerateModal && (
        <Modal
          isOpen={showGenerateModal}
          onClose={() => {
            setShowGenerateModal(false)
            resetGenerateForm()
          }}
        >
          <ModalContent>
            <ModalHeader>
              <Typography variant="h4">
                {t.actions?.generateTitle ?? 'Generar Cuota Faltante'}
              </Typography>
            </ModalHeader>
            <ModalBody>
              {generateResult ? (
                // Results view
                <div className="flex flex-col gap-3">
                  {generateResult.created.length > 0 && (
                    <div className="rounded-lg bg-success/10 p-3">
                      <Typography className="font-medium text-success" variant="body2">
                        {t.actions?.generateResultCreated ?? 'Creadas'}:{' '}
                        {generateResult.created.length}
                      </Typography>
                      <ul className="mt-1 list-inside list-disc text-sm text-default-600">
                        {generateResult.created.map(q => {
                          const monthName = q.periodMonth
                            ? new Date(q.periodYear, q.periodMonth - 1).toLocaleDateString(
                                'es-VE',
                                { month: 'long' }
                              )
                            : ''

                          return (
                            <li key={q.id}>
                              {monthName} {q.periodYear}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  {generateResult.skipped.length > 0 && (
                    <div className="rounded-lg bg-warning/10 p-3">
                      <Typography className="font-medium text-warning" variant="body2">
                        {t.actions?.generateResultSkipped ?? 'Omitidas'}:{' '}
                        {generateResult.skipped.length}
                      </Typography>
                      <ul className="mt-1 list-inside list-disc text-sm text-default-600">
                        {generateResult.skipped.map(s => {
                          const monthName = new Date(generateYear, s.month - 1).toLocaleDateString(
                            'es-VE',
                            { month: 'long' }
                          )

                          return (
                            <li key={s.month}>
                              {monthName} — {s.reason}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  {generateResult.failed.length > 0 && (
                    <div className="rounded-lg bg-danger/10 p-3">
                      <Typography className="font-medium text-danger" variant="body2">
                        {t.actions?.generateResultFailed ?? 'Errores'}:{' '}
                        {generateResult.failed.length}
                      </Typography>
                      <ul className="mt-1 list-inside list-disc text-sm text-default-600">
                        {generateResult.failed.map(f => {
                          const monthName = new Date(generateYear, f.month - 1).toLocaleDateString(
                            'es-VE',
                            { month: 'long' }
                          )

                          return (
                            <li key={f.month}>
                              {monthName} — {f.error}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  {generateResult.created.length === 0 && generateResult.failed.length === 0 && (
                    <Typography color="muted" variant="body2">
                      {t.actions?.generateResultSkipped ??
                        'Todas las cuotas ya existían para este periodo.'}
                    </Typography>
                  )}
                </div>
              ) : (
                // Form view
                <div className="flex flex-col gap-4">
                  {/* Concept selector - always shown first */}
                  {concepts.length === 0 ? (
                    <Typography color="muted" variant="body2">
                      {t.actions?.noConceptsAvailable ?? 'No hay conceptos disponibles'}
                    </Typography>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Select
                          items={concepts.map(c => ({ key: c.id, label: c.name }))}
                          label={t.actions?.generateConcept ?? 'Concepto de pago'}
                          placeholder={
                            t.actions?.generateConceptPlaceholder ?? 'Selecciona un concepto'
                          }
                          selectedKeys={generateConceptId ? [generateConceptId] : []}
                          onChange={key => setGenerateConceptId(key ?? '')}
                        />
                      </div>
                      {generateConceptId && (
                        <Button
                          isIconOnly
                          color="primary"
                          variant="light"
                          onPress={() => setShowConceptPreview(true)}
                        >
                          <Eye size={18} />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Mode toggle switch */}
                  {generateConceptId && (
                    <>
                      <div className="flex items-center gap-3 rounded-lg bg-default-50 p-3">
                        <CalendarDays className="text-default-500" size={18} />
                        <div className="flex-1">
                          <Switch
                            isSelected={generateMode === 'all'}
                            size="sm"
                            onValueChange={selected => setGenerateMode(selected ? 'all' : 'single')}
                          >
                            <Typography variant="body2">
                              {t.actions?.generateModeAll ?? 'Todos los periodos faltantes'}
                            </Typography>
                          </Switch>
                        </div>
                      </div>

                      <Typography color="muted" variant="body2">
                        {generateMode === 'all'
                          ? (t.actions?.generateAllDescription ??
                            'Genera todas las cuotas faltantes del año para este concepto, según su recurrencia y fechas de vigencia.')
                          : (t.actions?.generateDescription ??
                            'Genera una cuota para un periodo específico que no fue generado automáticamente.')}
                      </Typography>

                      {/* Year (always shown) + Month (only for single) */}
                      <div className={generateMode === 'single' ? 'grid grid-cols-2 gap-3' : ''}>
                        <Input
                          label={t.actions?.generateYear ?? 'Año'}
                          type="number"
                          value={String(generateYear)}
                          onValueChange={v =>
                            setGenerateYear(parseInt(v) || new Date().getFullYear())
                          }
                        />
                        {generateMode === 'single' && (
                          <Select
                            items={monthOptions}
                            label={t.actions?.generateMonth ?? 'Mes'}
                            placeholder={t.actions?.generateMonthPlaceholder ?? 'Selecciona un mes'}
                            selectedKeys={generateMonth ? [String(generateMonth)] : []}
                            onChange={key => setGenerateMonth(parseInt(key ?? '0'))}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  setShowGenerateModal(false)
                  resetGenerateForm()
                }}
              >
                {t.actions?.close ?? 'Cerrar'}
              </Button>
              {!generateResult && (
                <Button
                  color="primary"
                  isDisabled={
                    !generateConceptId ||
                    concepts.length === 0 ||
                    (generateMode === 'single' && !generateMonth)
                  }
                  isLoading={generateMutation.isPending || generateAllMutation.isPending}
                  onPress={handleGenerateConfirm}
                >
                  {t.actions?.confirmGenerate ?? 'Generar cuota'}
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Concept preview modal */}
      {showConceptPreview && generateConceptId && t.actions?.conceptPreview && (
        <ConceptPreviewPanel
          conceptId={generateConceptId}
          isOpen={showConceptPreview}
          translations={t.actions.conceptPreview}
          unitId={unitId}
          onClose={() => setShowConceptPreview(false)}
        />
      )}
    </Modal>
  )
}
