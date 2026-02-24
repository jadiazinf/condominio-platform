'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Upload, X, FileText, Image, AlertTriangle, ExternalLink } from 'lucide-react'
import type { TServiceExecution } from '@packages/domain'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { CurrencyInput } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Progress } from '@/ui/components/progress'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import {
  useCreateServiceExecution,
  useUpdateServiceExecution,
  useCurrency,
} from '@packages/http-client/hooks'
import { useServiceExecutionAttachmentUpload } from '../hooks/useServiceExecutionAttachmentUpload'

// ─────────────────────────────────────────────────────────────────────────────
// Form schema
// ─────────────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'required'),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  notes: z.string().optional(),
})

const executionFormSchema = z.object({
  title: z.string().min(1, 'required').max(255),
  description: z.string().max(2000).optional(),
  executionDate: z.string().min(1, 'required'),
  invoiceNumber: z.string().max(100).optional(),
  status: z.enum(['draft', 'confirmed']),
  totalAmount: z.string().min(1, 'required'),
  notes: z.string().max(5000).optional(),
  items: z.array(itemSchema),
})

type TExecutionFormValues = z.infer<typeof executionFormSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface IExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
  serviceId: string
  condominiumId: string
  currencyId: string
  conceptId?: string | null
  execution?: TServiceExecution | null
  onSuccess?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExecutionModal({
  isOpen,
  onClose,
  managementCompanyId,
  serviceId,
  condominiumId,
  currencyId,
  conceptId,
  execution,
  onSuccess,
}: IExecutionModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const d = 'admin.condominiums.detail.services.detail'
  const isEditing = !!execution

  // Stable ID used for the Firebase storage folder
  const storageId = useRef(crypto.randomUUID())

  // Active tab
  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'attachments'>('general')

  // Existing attachments (from the execution being edited, minus removed ones)
  const [existingAttachments, setExistingAttachments] = useState<TServiceExecution['attachments']>([])

  // Currency info
  const { data: currencyData } = useCurrency(currencyId)
  const currency = currencyData?.data
  const currencySymbol = currency?.symbol ?? currency?.code ?? '$'
  const currencyDecimals = currency?.decimals ?? 2

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
    resolver: zodResolver(executionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      executionDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      status: 'draft',
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
        methods.reset({
          title: execution.title,
          description: execution.description ?? '',
          executionDate: execution.executionDate,
          invoiceNumber: execution.invoiceNumber ?? '',
          status: execution.status,
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
      } else {
        methods.reset({
          title: '',
          description: '',
          executionDate: new Date().toISOString().split('T')[0],
          invoiceNumber: '',
          status: 'draft',
          totalAmount: '0',
          notes: '',
          items: [],
        })
        setExistingAttachments([])
        clearUploads()
        storageId.current = crypto.randomUUID()
      }
      setActiveTab('general')
    }
  }, [isOpen, execution, methods, clearUploads])

  // Auto-calculate totalAmount when items change
  const items = methods.watch('items')
  useEffect(() => {
    if (items.length > 0) {
      const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      methods.setValue('totalAmount', String(total.toFixed(currencyDecimals)))
    }
  }, [items, methods, currencyDecimals])

  // Auto-calculate item amount when quantity or unitPrice changes
  const handleItemChange = useCallback(
    (index: number) => {
      const quantity = Number(methods.getValues(`items.${index}.quantity`)) || 0
      const unitPrice = Number(methods.getValues(`items.${index}.unitPrice`)) || 0
      methods.setValue(`items.${index}.amount`, quantity * unitPrice)
    },
    [methods]
  )

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreateServiceExecution(
    managementCompanyId,
    serviceId,
    condominiumId,
    {
      onSuccess: () => {
        toast.success(t(`${d}.executionCreated`))
        handleClose()
        onSuccess?.()
      },
      onError: () => toast.error(t(`${d}.executionCreateError`)),
    }
  )

  const updateMutation = useUpdateServiceExecution(
    managementCompanyId,
    serviceId,
    condominiumId,
    {
      onSuccess: () => {
        toast.success(t(`${d}.executionUpdated`))
        handleClose()
        onSuccess?.()
      },
      onError: () => toast.error(t(`${d}.executionUpdateError`)),
    }
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (!isPending && !isUploading) {
      onClose()
    }
  }, [isPending, isUploading, onClose])

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
    const allAttachments = [
      ...existingAttachments,
      ...completedAttachments,
    ]

    const payload = {
      title: data.title,
      description: data.description || undefined,
      executionDate: data.executionDate,
      invoiceNumber: data.invoiceNumber || undefined,
      status: data.status,
      totalAmount: data.totalAmount,
      currencyId: execution?.currencyId ?? currencyId,
      notes: data.notes || undefined,
      items: data.items,
      attachments: allAttachments,
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

  // ─── Status items ──────────────────────────────────────────────────────────
  const statusItems: ISelectItem[] = [
    { key: 'draft', label: t(`${d}.draft`) },
    { key: 'confirmed', label: t(`${d}.confirmed`) },
  ]

  // ─── Tab classes ───────────────────────────────────────────────────────────
  const tabClass = (tab: typeof activeTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'border-primary text-primary'
        : 'border-transparent text-default-500 hover:text-default-700'
    }`

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <Typography variant="h4">
              {isEditing ? t(`${d}.editExecution`) : t(`${d}.createExecution`)}
            </Typography>
          </ModalHeader>

          <ModalBody className="gap-0 p-0">
            {/* Tabs */}
            <div className="flex border-b border-divider px-6">
              <button type="button" className={tabClass('general')} onClick={() => setActiveTab('general')}>
                {t(`${d}.title`)}
              </button>
              <button type="button" className={tabClass('items')} onClick={() => setActiveTab('items')}>
                {t(`${d}.items`)} {fields.length > 0 && `(${fields.length})`}
              </button>
              <button type="button" className={tabClass('attachments')} onClick={() => setActiveTab('attachments')}>
                {t(`${d}.attachments`)}{' '}
                {(existingAttachments.length + completedAttachments.length) > 0 &&
                  `(${existingAttachments.length + completedAttachments.length})`}
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* ── General Tab ──────────────────────────────────────────── */}
              {activeTab === 'general' && (
                <>
                  <Input
                    label={t(`${d}.title`)}
                    isRequired
                    {...methods.register('title')}
                    errorMessage={methods.formState.errors.title?.message}
                    isInvalid={!!methods.formState.errors.title}
                    variant="bordered"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={t(`${d}.executionDate`)}
                      type="date"
                      isRequired
                      {...methods.register('executionDate')}
                      errorMessage={methods.formState.errors.executionDate?.message}
                      isInvalid={!!methods.formState.errors.executionDate}
                      variant="bordered"
                    />
                    <Input
                      label={t(`${d}.invoiceNumber`)}
                      {...methods.register('invoiceNumber')}
                      variant="bordered"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={methods.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <CurrencyInput
                          label={t(`${d}.totalAmount`)}
                          isRequired
                          value={field.value}
                          onValueChange={field.onChange}
                          currencySymbol={currencySymbol}
                          decimals={currencyDecimals}
                          errorMessage={methods.formState.errors.totalAmount?.message}
                          isInvalid={!!methods.formState.errors.totalAmount}
                          isReadOnly={fields.length > 0}
                          description={fields.length > 0 ? t(`${d}.autoCalculated`) : undefined}
                        />
                      )}
                    />
                    <Select
                      aria-label={t(`${d}.status`)}
                      label={t(`${d}.status`)}
                      items={statusItems}
                      value={methods.watch('status')}
                      onChange={key => {
                        if (key) methods.setValue('status', key as 'draft' | 'confirmed')
                      }}
                      variant="bordered"
                    />
                  </div>

                  <Textarea
                    label={t(`${d}.description`)}
                    {...methods.register('description')}
                    variant="bordered"
                    minRows={2}
                    maxRows={4}
                  />

                  <Textarea
                    label={t(`${d}.notes`)}
                    {...methods.register('notes')}
                    variant="bordered"
                    minRows={2}
                    maxRows={4}
                  />
                </>
              )}

              {/* ── Items Tab ────────────────────────────────────────────── */}
              {activeTab === 'items' && (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <Typography variant="body2" className="font-medium text-default-600">
                      {t(`${d}.items`)} {fields.length > 0 && `(${fields.length})`}
                    </Typography>
                    <Button
                      type="button"
                      variant="bordered"
                      startContent={<Plus size={16} />}
                      onPress={addItem}
                      size="sm"
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
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => remove(index)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          <Input
                            placeholder={t(`${d}.itemDescription`)}
                            {...methods.register(`items.${index}.description`)}
                            errorMessage={methods.formState.errors.items?.[index]?.description?.message}
                            isInvalid={!!methods.formState.errors.items?.[index]?.description}
                            variant="bordered"
                            size="sm"
                          />

                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              label={t(`${d}.itemQuantity`)}
                              type="number"
                              {...methods.register(`items.${index}.quantity`, {
                                onChange: () => handleItemChange(index),
                              })}
                              variant="bordered"
                              size="sm"
                            />
                            <Controller
                              control={methods.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field: f }) => (
                                <CurrencyInput
                                  label={t(`${d}.itemUnitPrice`)}
                                  value={String(f.value ?? 0)}
                                  onValueChange={v => {
                                    const newUnitPrice = parseFloat(v) || 0
                                    f.onChange(newUnitPrice)
                                    const quantity = Number(methods.getValues(`items.${index}.quantity`)) || 0
                                    methods.setValue(`items.${index}.amount`, quantity * newUnitPrice)
                                  }}
                                  currencySymbol={currencySymbol}
                                  decimals={currencyDecimals}
                                  size="sm"
                                />
                              )}
                            />
                            <Controller
                              control={methods.control}
                              name={`items.${index}.amount`}
                              render={({ field: f }) => (
                                <CurrencyInput
                                  label={t(`${d}.itemAmount`)}
                                  value={String(f.value ?? 0)}
                                  onValueChange={f.onChange}
                                  currencySymbol={currencySymbol}
                                  decimals={currencyDecimals}
                                  isReadOnly
                                  size="sm"
                                />
                              )}
                            />
                          </div>

                          <Input
                            placeholder={t(`${d}.itemNotesPlaceholder`)}
                            {...methods.register(`items.${index}.notes`)}
                            variant="bordered"
                            size="sm"
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
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => document.getElementById('exec-file-input')?.click()}
                  >
                    <Upload size={24} className="text-default-400" />
                    <Typography variant="body2" color="muted" className="text-center">
                      {t(`${d}.dropFilesHere`)}
                    </Typography>
                    <Typography variant="caption" color="muted" className="text-center text-xs">
                      {t(`${d}.allowedFiles`)}
                    </Typography>
                    <input
                      id="exec-file-input"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      title="Seleccionar archivos"
                      aria-label="Seleccionar archivos"
                      onChange={handleFileInput}
                    />
                  </div>

                  {/* Uploading files */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <Typography variant="body2" className="font-medium text-sm">
                        {t(`${d}.uploadFiles`)}
                      </Typography>
                      {uploadingFiles.map(uf => (
                        <div
                          key={uf.id}
                          className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                        >
                          {getFileTypeCategory(uf.file.type) === 'image' ? (
                            <Image size={16} className="text-primary shrink-0" />
                          ) : (
                            <FileText size={16} className="text-danger shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{uf.file.name}</p>
                            <p className="text-xs text-default-400">{formatFileSize(uf.file.size)}</p>
                            {(uf.status === 'uploading' || uf.status === 'pending') && (
                              <Progress value={uf.progress} size="sm" className="mt-1" color="success" />
                            )}
                            {uf.status === 'error' && (
                              <p className="text-xs text-danger flex items-center gap-1 mt-1">
                                <AlertTriangle size={12} />
                                {uf.error ?? t(`${d}.uploadFailed`)}
                              </p>
                            )}
                          </div>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              uf.status === 'completed'
                                ? 'success'
                                : uf.status === 'error'
                                ? 'danger'
                                : 'default'
                            }
                          >
                            {uf.status === 'completed'
                              ? '✓'
                              : uf.status === 'error'
                              ? '✗'
                              : `${uf.progress}%`}
                          </Chip>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
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
                      <Typography variant="body2" className="font-medium text-sm">
                        {t(`${d}.savedFiles`)}
                      </Typography>
                      {existingAttachments.map(attachment => (
                        <div
                          key={attachment.url}
                          className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                        >
                          {getFileTypeCategory(attachment.mimeType) === 'image' ? (
                            <Image size={16} className="text-primary shrink-0" />
                          ) : (
                            <FileText size={16} className="text-danger shrink-0" />
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
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={attachment.name}
                            aria-label={attachment.name}
                            className="text-default-400 hover:text-primary"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => removeExistingAttachment(attachment.url)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {existingAttachments.length === 0 && uploadingFiles.length === 0 && (
                    <Typography color="muted" variant="body2" className="text-center">
                      {t(`${d}.noAttachments`)}
                    </Typography>
                  )}
                </div>
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="bordered" onPress={handleClose} isDisabled={isPending || isUploading}>
              {t(`${d}.cancel`)}
            </Button>
            <Button
              type="submit"
              color="primary"
              isLoading={isPending}
              isDisabled={isUploading || hasUploadErrors}
            >
              {isPending ? t(`${d}.saving`) : t(`${d}.save`)}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
