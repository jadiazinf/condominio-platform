'use client'

import type { TServiceExecution, TWizardExecutionData } from '@packages/domain'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Trash2,
  Upload,
  X,
  FileText,
  Image,
  AlertTriangle,
  ExternalLink,
  History,
  Clock,
  Calculator,
} from 'lucide-react'
import {
  useCreateServiceExecution,
  useUpdateServiceExecution,
  useCurrency,
  usePaymentConceptDetail,
  useServiceExecutionsPaginated,
} from '@packages/http-client/hooks'
import { HttpError } from '@packages/http-client'

import { useServiceExecutionAttachmentUpload } from '../hooks/useServiceExecutionAttachmentUpload'
import { CurrencyCalculatorModal } from '../../payment-concepts/components/wizard/steps/CurrencyCalculatorModal'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { DatePicker } from '@/ui/components/date-picker'
import { Input } from '@/ui/components/input'
import { CurrencyInput } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Progress } from '@/ui/components/progress'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

// ─────────────────────────────────────────────────────────────────────────────
// Form schema
// ─────────────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'required'),
  quantity: z.number({ error: 'required' }).positive('required'),
  unitPrice: z.number({ error: 'required' }).min(0, 'required'),
  amount: z.number().min(0),
  notes: z.string().optional(),
})

const executionFormBaseSchema = z.object({
  title: z.string().min(1, 'required').max(255),
  description: z.string().max(2000).optional(),
  executionDate: z.string().optional().default(''),
  executionDay: z.number().int().min(1).max(28).optional(),
  dateMode: z.enum(['fixed', 'day_of_month']).default('fixed'),
  invoiceNumber: z.string().max(100).optional(),
  totalAmount: z.string().min(1, 'required'),
  notes: z.string().max(5000).optional(),
  items: z.array(itemSchema),
})

type TExecutionFormValues = z.infer<typeof executionFormBaseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface IExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
  serviceId: string
  serviceName?: string
  condominiumId: string
  currencyId?: string
  conceptId?: string | null
  execution?: TServiceExecution | null
  onSuccess?: () => void
  /** Wizard mode: capture data locally instead of calling API */
  onSaveLocal?: (data: TWizardExecutionData) => void
  /** Pre-fill form from previously saved wizard data */
  wizardExecution?: TWizardExecutionData | null
  /** Available currencies for the currency calculator */
  currencies?: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  /** Whether the parent concept is recurring — enables "day of month" option */
  isRecurring?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExecutionModal({
  isOpen,
  onClose,
  managementCompanyId,
  serviceId,
  serviceName,
  condominiumId,
  currencyId,
  conceptId,
  execution,
  onSuccess,
  onSaveLocal,
  wizardExecution,
  currencies,
  isRecurring,
}: IExecutionModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const d = 'admin.condominiums.detail.services.detail'
  const isWizardMode = !!onSaveLocal
  const isEditing = !!execution || !!wizardExecution

  // Stable ID used for the Firebase storage folder
  const storageId = useRef(crypto.randomUUID())

  // Active tab
  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'attachments'>('general')

  // Calculator state: tracks which field to set when calculator confirms
  const [calculatorTarget, setCalculatorTarget] = useState<
    'totalAmount' | { type: 'unitPrice'; index: number } | null
  >(null)

  const showCalculator = !!currencies && currencies.length > 0 && !!currencyId

  // Existing attachments (from the execution being edited, minus removed ones)
  const [existingAttachments, setExistingAttachments] = useState<TServiceExecution['attachments']>(
    []
  )

  // Currency info — prefer useCurrency hook, fallback to currencies prop (wizard mode)
  const { data: currencyData } = useCurrency(currencyId ?? '')
  const currency = currencyData?.data
  const currencyFromProps = useMemo(
    () => currencies?.find(c => c.id === currencyId),
    [currencies, currencyId]
  )
  const currencySymbol =
    currency?.symbol ??
    currency?.code ??
    currencyFromProps?.symbol ??
    currencyFromProps?.code ??
    '$'
  const currencyDecimals = currency?.decimals ?? 2

  // Payment concept info
  const { data: conceptData } = usePaymentConceptDetail({
    companyId: managementCompanyId,
    conceptId: conceptId ?? '',
    enabled: !!conceptId,
  })
  const concept = conceptData?.data

  const conceptTypeLabels: Record<string, string> = useMemo(
    () => ({
      maintenance: t('admin.paymentConcepts.types.maintenance'),
      condominium_fee: t('admin.paymentConcepts.types.condominiumFee'),
      extraordinary: t('admin.paymentConcepts.types.extraordinary'),
      fine: t('admin.paymentConcepts.types.fine'),
      reserve_fund: t('admin.paymentConcepts.types.reserveFund'),
      other: t('admin.paymentConcepts.types.other'),
    }),
    [t]
  )

  // ─── Execution history (for "use as template") ────────────────────────────
  const [showHistory, setShowHistory] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const HISTORY_LIMIT = 5

  const { data: historyData, isLoading: historyLoading } = useServiceExecutionsPaginated({
    companyId: managementCompanyId,
    serviceId,
    condominiumId,
    query: { page: historyPage, limit: HISTORY_LIMIT },
    enabled: showHistory && !isEditing,
  })

  const historyExecutions = useMemo(
    () => (historyData?.data ?? []) as TServiceExecution[],
    [historyData]
  )
  const historyPagination = historyData?.pagination ?? {
    page: 1,
    limit: HISTORY_LIMIT,
    total: 0,
    totalPages: 0,
  }

  // ─── Upload hook ───────────────────────────────────────────────────────────
  const {
    uploadingFiles,
    completedAttachments,
    isUploading,
    hasErrors: hasUploadErrors,
    addFiles,
    removeFile,
    clearAll: clearUploads,
    getFileTypeCategory,
    formatFileSize,
  } = useServiceExecutionAttachmentUpload({
    storageId: execution?.id ?? storageId.current,
    onValidationError: errors => {
      const firstError = errors[0]

      if (firstError?.reason === 'file_too_large') {
        toast.error(t(`${d}.fileTooLarge`))
      } else {
        toast.error(t(`${d}.fileTypeNotAllowed`))
      }
    },
  })

  // ─── Form ──────────────────────────────────────────────────────────────────
  const methods = useForm<TExecutionFormValues>({
    resolver: zodResolver(executionFormBaseSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      executionDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      totalAmount: '0',
      notes: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'items',
  })

  // Reset form & state when modal opens/closes or execution changes
  useEffect(() => {
    if (isOpen) {
      if (execution) {
        const isTemplatExec = !!(execution as any).isTemplate

        methods.reset({
          title: execution.title,
          description: execution.description ?? '',
          executionDate: execution.executionDate ?? '',
          executionDay: (execution as any).executionDay ?? undefined,
          dateMode: isTemplatExec ? 'day_of_month' : 'fixed',
          invoiceNumber: execution.invoiceNumber ?? '',
          totalAmount: String(execution.totalAmount),
          notes: execution.notes ?? '',
          items: (execution.items ?? []).map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            notes: item.notes ?? '',
          })),
        })
        setExistingAttachments(execution.attachments ?? [])
      } else if (wizardExecution) {
        const isTemplatExec = !!wizardExecution.isTemplate

        methods.reset({
          title: wizardExecution.title,
          description: wizardExecution.description ?? '',
          executionDate: wizardExecution.executionDate ?? '',
          executionDay: wizardExecution.executionDay ?? undefined,
          dateMode: isTemplatExec ? 'day_of_month' : 'fixed',
          invoiceNumber: wizardExecution.invoiceNumber ?? '',
          totalAmount: String(wizardExecution.totalAmount),
          notes: wizardExecution.notes ?? '',
          items: (wizardExecution.items ?? []).map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            notes: item.notes ?? '',
          })),
        })
        setExistingAttachments(
          (wizardExecution.attachments ?? []) as TServiceExecution['attachments']
        )
      } else {
        methods.reset({
          title: '',
          description: '',
          executionDate: new Date().toISOString().split('T')[0],
          executionDay: undefined,
          dateMode: isRecurring ? 'day_of_month' : 'fixed',
          invoiceNumber: '',
          totalAmount: '0',
          notes: '',
          items: [],
        })
        setExistingAttachments([])
        clearUploads()
        storageId.current = crypto.randomUUID()
      }
      setActiveTab('general')
      setShowHistory(false)
      setHistoryPage(1)
    }
  }, [isOpen, execution, wizardExecution, methods, clearUploads])

  // Recalculate totalAmount from all item amounts
  const recalculateTotal = useCallback(() => {
    const allItems = methods.getValues('items')

    if (allItems.length > 0) {
      const total = allItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

      methods.setValue('totalAmount', String(total.toFixed(currencyDecimals)))
    }
  }, [methods, currencyDecimals])

  // Handle calculator confirmation
  const handleCalculatorConfirm = useCallback(
    (convertedAmount: string) => {
      if (calculatorTarget === 'totalAmount') {
        methods.setValue('totalAmount', convertedAmount)
      } else if (calculatorTarget && typeof calculatorTarget === 'object') {
        const newUnitPrice = parseFloat(convertedAmount) || 0

        methods.setValue(`items.${calculatorTarget.index}.unitPrice`, newUnitPrice)
        const quantity = Number(methods.getValues(`items.${calculatorTarget.index}.quantity`)) || 0

        methods.setValue(`items.${calculatorTarget.index}.amount`, quantity * newUnitPrice)
        recalculateTotal()
      }
      setCalculatorTarget(null)
    },
    [calculatorTarget, methods, recalculateTotal]
  )

  // Auto-calculate item amount when quantity or unitPrice changes
  const handleItemChange = useCallback(
    (index: number) => {
      const quantity = Number(methods.getValues(`items.${index}.quantity`)) || 0
      const unitPrice = Number(methods.getValues(`items.${index}.unitPrice`)) || 0

      methods.setValue(`items.${index}.amount`, quantity * unitPrice)
      recalculateTotal()
    },
    [methods, recalculateTotal]
  )

  // Remove item and recalculate total
  const handleRemoveItem = useCallback(
    (index: number) => {
      remove(index)
      // After removal, recalculate on next tick (remove is async in useFieldArray)
      setTimeout(recalculateTotal, 0)
    },
    [remove, recalculateTotal]
  )

  // ─── Mutations (only used when NOT in wizard mode) ─────────────────────────
  const createMutation = useCreateServiceExecution(managementCompanyId, serviceId, condominiumId, {
    onSuccess: () => {
      toast.success(t(`${d}.executionCreated`))
      handleClose()
      onSuccess?.()
    },
    onError: error => {
      const msg = HttpError.isHttpError(error) ? error.message : t(`${d}.executionCreateError`)

      toast.error(msg)
    },
  })

  const updateMutation = useUpdateServiceExecution(managementCompanyId, serviceId, condominiumId, {
    onSuccess: () => {
      toast.success(t(`${d}.executionUpdated`))
      handleClose()
      onSuccess?.()
    },
    onError: error => {
      const msg = HttpError.isHttpError(error) ? error.message : t(`${d}.executionUpdateError`)

      toast.error(msg)
    },
  })

  const isPending = !isWizardMode && (createMutation.isPending || updateMutation.isPending)

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (!isPending && !isUploading) {
      onClose()
    }
  }, [isPending, isUploading, onClose])

  const handleSelectFromHistory = useCallback(
    (exec: TServiceExecution) => {
      const isTemplatExec = !!(exec as any).isTemplate

      methods.reset({
        title: exec.title,
        description: exec.description ?? '',
        executionDate: isTemplatExec ? '' : new Date().toISOString().split('T')[0],
        executionDay: (exec as any).executionDay ?? undefined,
        dateMode: isTemplatExec ? 'day_of_month' : 'fixed',
        invoiceNumber: exec.invoiceNumber ?? '',
        totalAmount: String(exec.totalAmount),
        notes: exec.notes ?? '',
        items: (exec.items ?? []).map(item => ({
          id: crypto.randomUUID(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          notes: item.notes ?? '',
        })),
      })
      setExistingAttachments([])
      setShowHistory(false)
      setActiveTab('general')
    },
    [methods]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const removeExistingAttachment = useCallback((url: string) => {
    setExistingAttachments(prev => prev.filter(a => a.url !== url))
  }, [])

  const handleSubmit = methods.handleSubmit(data => {
    // Cross-field validation
    if (data.dateMode === 'fixed' && !data.executionDate) {
      methods.setError('executionDate', { message: 'required' })

      return
    }
    if (data.dateMode === 'day_of_month' && !data.executionDay) {
      methods.setError('executionDay', { message: 'required' })

      return
    }

    const allAttachments = [...existingAttachments, ...completedAttachments]

    const payload = {
      title: data.title,
      description: data.description || undefined,
      executionDate: data.executionDate,
      invoiceNumber: data.invoiceNumber || undefined,
      totalAmount: data.totalAmount,
      currencyId: execution?.currencyId ?? currencyId ?? '',
      notes: data.notes || undefined,
      items: data.items,
      attachments: allAttachments,
    }

    // Wizard mode: save locally without calling API
    if (isWizardMode) {
      const isDayOfMonth = data.dateMode === 'day_of_month'

      onSaveLocal({
        title: payload.title,
        description: payload.description,
        executionDate: isDayOfMonth ? null : payload.executionDate,
        executionDay: isDayOfMonth ? data.executionDay : null,
        isTemplate: isDayOfMonth,
        totalAmount: payload.totalAmount,
        currencyId: payload.currencyId,
        invoiceNumber: payload.invoiceNumber,
        items: payload.items,
        attachments: allAttachments.map(a => ({
          name: a.name,
          url: a.url,
          mimeType: a.mimeType,
          size: a.size,
          storagePath: (a as any).storagePath ?? '',
        })),
        notes: payload.notes,
      })
      onClose()

      return
    }

    if (isEditing && execution) {
      updateMutation.mutate({ executionId: execution.id, ...payload })
    } else {
      createMutation.mutate({
        ...payload,
        paymentConceptId: conceptId ?? undefined,
      } as Parameters<typeof createMutation.mutate>[0])
    }
  })

  const addItem = useCallback(() => {
    append({
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      notes: '',
    })
  }, [append])

  // ─── Tab classes ───────────────────────────────────────────────────────────
  const tabClass = (tab: typeof activeTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'border-primary text-primary'
        : 'border-transparent text-default-500 hover:text-default-700'
    }`

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={handleClose}>
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col items-start">
            <Typography color="muted" variant="body2">
              {isEditing ? t(`${d}.editExecution`) : t(`${d}.createExecution`)}
            </Typography>
            {serviceName && <Typography variant="h4">{serviceName}</Typography>}
          </ModalHeader>

          <ModalBody className="gap-0 p-0 overflow-y-auto max-h-[60vh]">
            {/* Payment concept info */}
            {concept && (
              <div className="mx-6 mt-4 mb-2 p-3 bg-default-100 rounded-lg">
                <Typography className="text-default-500 mb-1" variant="body2">
                  {t(`${d}.linkedConcept`)}
                </Typography>
                <div className="flex items-center gap-2 flex-wrap">
                  <Typography variant="subtitle2">{concept.name}</Typography>
                  <Chip size="sm" variant="flat">
                    {conceptTypeLabels[concept.conceptType] ?? concept.conceptType}
                  </Chip>
                  {concept.isRecurring && (
                    <Chip color="primary" size="sm" variant="flat">
                      {t('admin.paymentConcepts.columns.recurring')}
                    </Chip>
                  )}
                </div>
              </div>
            )}

            {/* History template — only when creating */}
            {!isEditing && (
              <div className="mx-6 mt-4">
                <Button
                  className="w-full"
                  color="default"
                  size="sm"
                  startContent={<History size={16} />}
                  type="button"
                  variant="flat"
                  onPress={() => setShowHistory(!showHistory)}
                >
                  {t(`${d}.historyTemplate`)}
                </Button>

                {showHistory && (
                  <div className="mt-3 rounded-lg border border-default-200 p-4 space-y-3">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner size="sm" />
                      </div>
                    ) : historyExecutions.length === 0 ? (
                      <Typography className="text-center py-4" color="muted" variant="body2">
                        {t(`${d}.noExecutions`)}
                      </Typography>
                    ) : (
                      <div className="space-y-2">
                        {historyExecutions.map(exec => (
                          <div
                            key={exec.id}
                            className="flex items-center gap-3 rounded-lg border border-default-200 p-3 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectFromHistory(exec)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSelectFromHistory(exec)
                            }}
                          >
                            <Clock className="shrink-0 text-default-400" size={14} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{exec.title}</p>
                              <p className="text-xs text-default-500">{exec.executionDate}</p>
                            </div>
                            <span className="text-sm font-semibold whitespace-nowrap">
                              {currencySymbol}{' '}
                              {Number(exec.totalAmount).toLocaleString('es-VE', {
                                minimumFractionDigits: currencyDecimals,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {historyPagination.totalPages > 1 && (
                      <Pagination
                        limit={historyPagination.limit}
                        page={historyPagination.page}
                        showLimitSelector={false}
                        total={historyPagination.total}
                        totalPages={historyPagination.totalPages}
                        onPageChange={setHistoryPage}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-divider px-6">
              <button
                className={tabClass('general')}
                type="button"
                onClick={() => setActiveTab('general')}
              >
                {t(`${d}.title`)}
              </button>
              <button
                className={tabClass('items')}
                type="button"
                onClick={() => setActiveTab('items')}
              >
                {t(`${d}.items`)} {fields.length > 0 && `(${fields.length})`}
              </button>
              <button
                className={tabClass('attachments')}
                type="button"
                onClick={() => setActiveTab('attachments')}
              >
                {t(`${d}.attachments`)}{' '}
                {existingAttachments.length + completedAttachments.length > 0 &&
                  `(${existingAttachments.length + completedAttachments.length})`}
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* ── General Tab ──────────────────────────────────────────── */}
              {activeTab === 'general' && (
                <div className="flex flex-col gap-4">
                  <Input
                    isRequired
                    label={t(`${d}.title`)}
                    {...methods.register('title')}
                    errorMessage={methods.formState.errors.title?.message}
                    isInvalid={!!methods.formState.errors.title}
                    variant="bordered"
                  />

                  {/* Date mode toggle — only in wizard mode for recurring concepts */}
                  {isWizardMode && isRecurring && (
                    <Controller
                      control={methods.control}
                      name="dateMode"
                      render={({ field }) => (
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            color={field.value === 'day_of_month' ? 'primary' : 'default'}
                            size="sm"
                            type="button"
                            variant={field.value === 'day_of_month' ? 'solid' : 'bordered'}
                            onPress={() => field.onChange('day_of_month')}
                          >
                            {t(`${d}.dayOfMonth`)}
                          </Button>
                          <Button
                            className="flex-1"
                            color={field.value === 'fixed' ? 'primary' : 'default'}
                            size="sm"
                            type="button"
                            variant={field.value === 'fixed' ? 'solid' : 'bordered'}
                            onPress={() => field.onChange('fixed')}
                          >
                            {t(`${d}.fixedDate`)}
                          </Button>
                        </div>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {methods.watch('dateMode') === 'day_of_month' ? (
                      <Controller
                        control={methods.control}
                        name="executionDay"
                        render={({ field }) => (
                          <Input
                            isRequired
                            description="1-28"
                            errorMessage={methods.formState.errors.executionDay?.message}
                            isInvalid={!!methods.formState.errors.executionDay}
                            label={t(`${d}.executionDay`)}
                            type="number"
                            value={String(field.value ?? '')}
                            variant="bordered"
                            onValueChange={v => {
                              const n = v ? parseInt(v, 10) : undefined

                              if (n !== undefined && (n < 1 || n > 28)) return
                              field.onChange(n)
                            }}
                          />
                        )}
                      />
                    ) : (
                      <Controller
                        control={methods.control}
                        name="executionDate"
                        render={({ field }) => (
                          <DatePicker
                            isRequired
                            errorMessage={methods.formState.errors.executionDate?.message}
                            label={t(`${d}.executionDate`)}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    )}
                    <Input
                      label={t(`${d}.invoiceNumber`)}
                      {...methods.register('invoiceNumber')}
                      variant="bordered"
                    />
                  </div>

                  <div className="pt-2">
                    <Controller
                      control={methods.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <CurrencyInput
                          isRequired
                          currencySymbol={currencySymbol}
                          decimals={currencyDecimals}
                          endContent={
                            showCalculator && fields.length === 0 ? (
                              <button
                                className="text-default-400 hover:text-primary cursor-pointer"
                                title={t(`${d}.currencyCalculator`)}
                                type="button"
                                onClick={() => setCalculatorTarget('totalAmount')}
                              >
                                <Calculator size={16} />
                              </button>
                            ) : undefined
                          }
                          errorMessage={methods.formState.errors.totalAmount?.message}
                          isInvalid={!!methods.formState.errors.totalAmount}
                          isReadOnly={fields.length > 0}
                          label={t(`${d}.totalAmount`)}
                          tooltip={t(`${d}.totalAmountTooltip`)}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  <Textarea
                    label={t(`${d}.description`)}
                    {...methods.register('description')}
                    maxRows={4}
                    minRows={2}
                    variant="bordered"
                  />

                  <Textarea
                    label={t(`${d}.notes`)}
                    {...methods.register('notes')}
                    maxRows={4}
                    minRows={2}
                    variant="bordered"
                  />
                </div>
              )}

              {/* ── Items Tab ────────────────────────────────────────────── */}
              {activeTab === 'items' && (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <Typography className="font-medium text-default-600" variant="body2">
                      {t(`${d}.items`)} {fields.length > 0 && `(${fields.length})`}
                    </Typography>
                    <Button
                      size="sm"
                      startContent={<Plus size={16} />}
                      type="button"
                      variant="bordered"
                      onPress={addItem}
                    >
                      {t(`${d}.addItem`)}
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Typography color="muted" variant="body2">
                        {t(`${d}.noItemsHint`)}
                      </Typography>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="rounded-lg border border-default-200 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-default-500">
                              {t(`${d}.itemDescription`)} {index + 1}
                            </span>
                            <Button
                              isIconOnly
                              color="danger"
                              size="sm"
                              variant="light"
                              onPress={() => handleRemoveItem(index)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          <Input
                            placeholder={t(`${d}.itemDescription`)}
                            {...methods.register(`items.${index}.description`)}
                            errorMessage={
                              methods.formState.errors.items?.[index]?.description?.message
                            }
                            isInvalid={!!methods.formState.errors.items?.[index]?.description}
                            size="sm"
                            variant="bordered"
                          />

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Input
                              label={t(`${d}.itemQuantity`)}
                              type="number"
                              {...methods.register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                                onChange: () => handleItemChange(index),
                              })}
                              errorMessage={
                                methods.formState.errors.items?.[index]?.quantity?.message
                              }
                              isInvalid={!!methods.formState.errors.items?.[index]?.quantity}
                              size="sm"
                              variant="bordered"
                            />
                            <Controller
                              control={methods.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field: f }) => (
                                <CurrencyInput
                                  currencySymbol={currencySymbol}
                                  decimals={currencyDecimals}
                                  endContent={
                                    showCalculator ? (
                                      <button
                                        className="text-default-400 hover:text-primary cursor-pointer"
                                        title={t(`${d}.currencyCalculator`)}
                                        type="button"
                                        onClick={() =>
                                          setCalculatorTarget({ type: 'unitPrice', index })
                                        }
                                      >
                                        <Calculator size={14} />
                                      </button>
                                    ) : undefined
                                  }
                                  errorMessage={
                                    methods.formState.errors.items?.[index]?.unitPrice?.message
                                  }
                                  isInvalid={!!methods.formState.errors.items?.[index]?.unitPrice}
                                  label={t(`${d}.itemUnitPrice`)}
                                  size="sm"
                                  value={String(f.value ?? 0)}
                                  onValueChange={v => {
                                    const newUnitPrice = parseFloat(v) || 0

                                    f.onChange(newUnitPrice)
                                    const quantity =
                                      Number(methods.getValues(`items.${index}.quantity`)) || 0

                                    methods.setValue(
                                      `items.${index}.amount`,
                                      quantity * newUnitPrice
                                    )
                                    recalculateTotal()
                                  }}
                                />
                              )}
                            />
                            <Controller
                              control={methods.control}
                              name={`items.${index}.amount`}
                              render={({ field: f }) => (
                                <CurrencyInput
                                  isReadOnly
                                  currencySymbol={currencySymbol}
                                  decimals={currencyDecimals}
                                  label={t(`${d}.itemAmount`)}
                                  size="sm"
                                  value={String(f.value ?? 0)}
                                  onValueChange={f.onChange}
                                />
                              )}
                            />
                          </div>

                          <Input
                            placeholder={t(`${d}.itemNotesPlaceholder`)}
                            {...methods.register(`items.${index}.notes`)}
                            size="sm"
                            variant="bordered"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Attachments Tab ──────────────────────────────────────── */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-default-300 p-8 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                    onClick={() => document.getElementById('exec-file-input')?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <Upload className="text-default-400" size={24} />
                    <Typography className="text-center" color="muted" variant="body2">
                      {t(`${d}.dropFilesHere`)}
                    </Typography>
                    <Typography className="text-center text-xs" color="muted" variant="caption">
                      {t(`${d}.allowedFiles`)}
                    </Typography>
                    <input
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      aria-label="Seleccionar archivos"
                      className="hidden"
                      id="exec-file-input"
                      title="Seleccionar archivos"
                      type="file"
                      onChange={handleFileInput}
                    />
                  </div>

                  {/* Uploading files */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <Typography className="font-medium text-sm" variant="body2">
                        {t(`${d}.uploadFiles`)}
                      </Typography>
                      {uploadingFiles.map(uf => (
                        <div
                          key={uf.id}
                          className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                        >
                          {getFileTypeCategory(uf.file.type) === 'image' ? (
                            <Image className="text-primary shrink-0" size={16} />
                          ) : (
                            <FileText className="text-danger shrink-0" size={16} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{uf.file.name}</p>
                            <p className="text-xs text-default-400">
                              {formatFileSize(uf.file.size)}
                            </p>
                            {(uf.status === 'uploading' || uf.status === 'pending') && (
                              <Progress
                                className="mt-1"
                                color="success"
                                size="sm"
                                value={uf.progress}
                              />
                            )}
                            {uf.status === 'error' && (
                              <p className="text-xs text-danger flex items-center gap-1 mt-1">
                                <AlertTriangle size={12} />
                                {uf.error ?? t(`${d}.uploadFailed`)}
                              </p>
                            )}
                          </div>
                          <Chip
                            color={
                              uf.status === 'completed'
                                ? 'success'
                                : uf.status === 'error'
                                  ? 'danger'
                                  : 'default'
                            }
                            size="sm"
                            variant="flat"
                          >
                            {uf.status === 'completed'
                              ? '✓'
                              : uf.status === 'error'
                                ? '✗'
                                : `${uf.progress}%`}
                          </Chip>
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="light"
                            onPress={() => removeFile(uf.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Existing attachments */}
                  {existingAttachments.length > 0 && (
                    <div className="space-y-2">
                      <Typography className="font-medium text-sm" variant="body2">
                        {t(`${d}.savedFiles`)}
                      </Typography>
                      {existingAttachments.map(attachment => (
                        <div
                          key={attachment.url}
                          className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                        >
                          {getFileTypeCategory(attachment.mimeType) === 'image' ? (
                            <Image className="text-primary shrink-0" size={16} />
                          ) : (
                            <FileText className="text-danger shrink-0" size={16} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{attachment.name}</p>
                            {attachment.size && (
                              <p className="text-xs text-default-400">
                                {formatFileSize(attachment.size)}
                              </p>
                            )}
                          </div>
                          <a
                            aria-label={attachment.name}
                            className="text-default-400 hover:text-primary"
                            href={attachment.url}
                            rel="noopener noreferrer"
                            target="_blank"
                            title={attachment.name}
                          >
                            <ExternalLink size={14} />
                          </a>
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="light"
                            onPress={() => removeExistingAttachment(attachment.url)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {existingAttachments.length === 0 && uploadingFiles.length === 0 && (
                    <Typography className="text-center" color="muted" variant="body2">
                      {t(`${d}.noAttachments`)}
                    </Typography>
                  )}
                </div>
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button isDisabled={isPending || isUploading} variant="bordered" onPress={handleClose}>
              {t(`${d}.cancel`)}
            </Button>
            <Button
              color="primary"
              isDisabled={isUploading || hasUploadErrors}
              isLoading={isPending}
              type="submit"
            >
              {isPending ? t(`${d}.saving`) : t(`${d}.save`)}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>

      {/* Currency Calculator Modal */}
      {showCalculator && (
        <CurrencyCalculatorModal
          currencies={currencies!}
          isOpen={calculatorTarget !== null}
          targetCurrencyId={currencyId!}
          onClose={() => setCalculatorTarget(null)}
          onConfirm={handleCalculatorConfirm}
        />
      )}
    </Modal>
  )
}
