'use client'

import type { TCondominiumService, TTaxIdType } from '@packages/domain'
import type { IStepItem } from '@/ui/components/stepper'
import type { TExpensesTranslations } from './types'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Upload,
  X,
  RefreshCw,
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import {
  useCreateReserveFundExpense,
  useCondominiumServicesPaginated,
} from '@packages/http-client/hooks'
import { formatFileSize } from '@packages/domain'

import { useExpenseDocumentUpload, EXPENSE_ACCEPT_STRING } from '../hooks/useExpenseDocumentUpload'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Input, CurrencyInput } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Stepper } from '@/ui/components/stepper'
import { Progress } from '@/ui/components/progress'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Pagination } from '@/ui/components/pagination'
import { Tabs, Tab } from '@/ui/components/tabs'
import { useToast } from '@/ui/components/toast'
import { TaxIdInput } from '@/ui/components/tax-id-input'
import { PhoneInput } from '@/ui/components/phone-input'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CreateReserveFundExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  translations: TExpensesTranslations['form']
}

interface IExpenseFormData {
  name: string
  description: string
  amount: string
  currencyId: string
  expenseDate: string
  vendorName: string
  vendorTaxIdType: TTaxIdType | ''
  vendorTaxIdNumber: string
  vendorType: '' | 'individual' | 'company'
  vendorPhoneCountryCode: string
  vendorPhoneNumber: string
  vendorEmail: string
  vendorAddress: string
  invoiceNumber: string
  notes: string
}

const INITIAL_FORM_DATA: IExpenseFormData = {
  name: '',
  description: '',
  amount: '',
  currencyId: '',
  expenseDate: '',
  vendorName: '',
  vendorTaxIdType: '',
  vendorTaxIdNumber: '',
  vendorType: '',
  vendorPhoneCountryCode: '',
  vendorPhoneNumber: '',
  vendorEmail: '',
  vendorAddress: '',
  invoiceNumber: '',
  notes: '',
}

const STEPS = ['chargeInfo', 'vendor', 'documents', 'review'] as const

type TVendorMode = 'existing' | 'manual'

interface IServiceRow {
  id: string
  name: string
  providerType: string
  taxIdNumber: string | null
  phone: string | null
}

const PROVIDER_TYPE_COLORS: Record<
  string,
  'primary' | 'secondary' | 'success' | 'warning' | 'default'
> = {
  individual: 'primary',
  company: 'secondary',
  cooperative: 'success',
  government: 'warning',
  internal: 'default',
}

const SERVICE_COLUMNS: ITableColumn<IServiceRow>[] = [
  { key: 'name', label: '' },
  { key: 'providerType', label: '' },
  { key: 'taxIdNumber', label: '' },
  { key: 'phone', label: '' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreateReserveFundExpenseModal({
  isOpen,
  onClose,
  condominiumId,
  managementCompanyId,
  currencies,
  translations: t,
}: CreateReserveFundExpenseModalProps) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutateAsync, isPending } = useCreateReserveFundExpense(managementCompanyId)

  const [currentStep, setCurrentStep] = useState(0)

  const defaultCurrencyId = useMemo(() => {
    const usd = currencies.find(c => c.code === 'USD')

    return usd?.id ?? currencies[0]?.id ?? ''
  }, [currencies])

  const [formData, setFormData] = useState<IExpenseFormData>({
    ...INITIAL_FORM_DATA,
    currencyId: defaultCurrencyId,
  })

  // Vendor mode
  const [vendorMode, setVendorMode] = useState<TVendorMode>('existing')
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set())

  // Services table state
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [servicePage, setServicePage] = useState(1)
  const serviceLimit = 5

  const { data: servicesData, isLoading: servicesLoading } = useCondominiumServicesPaginated({
    companyId: managementCompanyId,
    condominiumId,
    query: {
      page: servicePage,
      limit: serviceLimit,
      isActive: true,
      search: serviceSearch || undefined,
      providerType: serviceTypeFilter === 'all' ? undefined : serviceTypeFilter,
    },
    enabled: !!managementCompanyId && isOpen && vendorMode === 'existing',
  })

  const services = useMemo(
    () => (servicesData?.data ?? []) as TCondominiumService[],
    [servicesData]
  )
  const servicesPagination = servicesData?.pagination ?? {
    page: 1,
    limit: serviceLimit,
    total: 0,
    totalPages: 0,
  }

  const {
    uploadingFiles,
    completedAttachments,
    isUploading,
    addFiles,
    removeFile,
    retryFile,
    clearAll,
  } = useExpenseDocumentUpload({
    onValidationError: errors => {
      for (const err of errors) {
        toast.error(
          err.reason === 'file_too_large'
            ? `${err.file.name}: ${t.documents.maxSize}`
            : `${err.file.name}: ${t.documents.allowedTypes}`
        )
      }
    },
  })

  const wizardSteps: IStepItem<string>[] = useMemo(
    () => [
      { key: 'chargeInfo', title: t.steps.chargeInfo },
      { key: 'vendor', title: t.steps.vendor },
      { key: 'documents', title: t.steps.documents },
      { key: 'review', title: t.steps.review },
    ],
    [t.steps]
  )

  const currencyItems: ISelectItem[] = useMemo(
    () =>
      currencies
        .map(c => ({ key: c.id, label: c.name ? `${c.code} — ${c.name}` : c.code }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [currencies]
  )

  const vendorTypeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'individual', label: t.vendor.individual },
      { key: 'company', label: t.vendor.company },
    ],
    [t.vendor]
  )

  const providerTypeFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.vendor.allTypes },
      { key: 'individual', label: t.vendor.individual },
      { key: 'company', label: t.vendor.company },
      { key: 'cooperative', label: t.vendor.cooperative },
      { key: 'government', label: t.vendor.government },
      { key: 'internal', label: t.vendor.internal },
    ],
    [t.vendor]
  )

  const providerTypeLabels: Record<string, string> = useMemo(
    () => ({
      individual: t.vendor.individual,
      company: t.vendor.company,
      cooperative: t.vendor.cooperative,
      government: t.vendor.government,
      internal: t.vendor.internal,
    }),
    [t.vendor]
  )

  const currencySymbol = useMemo(() => {
    if (!formData.currencyId) return '$'
    const cur = currencies.find(c => c.id === formData.currencyId)

    return cur?.symbol || cur?.code || '$'
  }, [formData.currencyId, currencies])

  const updateForm = useCallback((updates: Partial<IExpenseFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  // Table columns with translated labels
  const serviceColumns: ITableColumn<IServiceRow>[] = useMemo(
    () =>
      SERVICE_COLUMNS.map(col => ({
        ...col,
        label:
          col.key === 'name'
            ? t.vendor.tableName
            : col.key === 'providerType'
              ? t.vendor.tableType
              : col.key === 'taxIdNumber'
                ? t.vendor.tableTaxId
                : t.vendor.tablePhone,
      })),
    [t.vendor]
  )

  const serviceRows: IServiceRow[] = useMemo(
    () =>
      services.map(s => ({
        id: s.id,
        name: s.legalName ? `${s.name} — ${s.legalName}` : s.name,
        providerType: s.providerType,
        taxIdNumber: s.taxIdNumber,
        phone: s.phone,
      })),
    [services]
  )

  const renderServiceCell = useCallback(
    (row: IServiceRow, columnKey: keyof IServiceRow | string) => {
      switch (columnKey) {
        case 'name':
          return <span className="font-medium">{row.name}</span>
        case 'providerType':
          return (
            <Chip
              color={PROVIDER_TYPE_COLORS[row.providerType] ?? 'default'}
              size="sm"
              variant="flat"
            >
              {providerTypeLabels[row.providerType] ?? row.providerType}
            </Chip>
          )
        case 'taxIdNumber':
          return <span className="text-default-500">{row.taxIdNumber ?? '-'}</span>
        case 'phone':
          return <span className="text-default-500">{row.phone ?? '-'}</span>
        default:
          return null
      }
    },
    [providerTypeLabels]
  )

  const handleServiceSelectionChange = useCallback(
    (keys: 'all' | Set<string | number>) => {
      if (keys === 'all') {
        setSelectedServiceIds(new Set(services.map(s => s.id)))
      } else {
        setSelectedServiceIds(new Set(Array.from(keys).map(String)))
      }
    },
    [services]
  )

  // Get selected service names for review
  const selectedServiceNames = useMemo(() => {
    if (selectedServiceIds.size === 0) return []

    // We need to look across all known services
    return services
      .filter(s => selectedServiceIds.has(s.id))
      .map(s => (s.legalName ? `${s.name} — ${s.legalName}` : s.name))
  }, [selectedServiceIds, services])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return !!(
          formData.name.trim() &&
          formData.amount.trim() &&
          formData.currencyId &&
          formData.expenseDate
        )
      case 1:
        if (vendorMode === 'manual') {
          return !!(formData.vendorName.trim() && formData.vendorType)
        }

        return true
      case 2:
        return !isUploading
      case 3:
        return true
      default:
        return false
    }
  }, [currentStep, formData, isUploading, vendorMode])

  const handleNext = () => {
    if (canProceed() && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    setFormData({ ...INITIAL_FORM_DATA, currencyId: defaultCurrencyId })
    setVendorMode('existing')
    setSelectedServiceIds(new Set())
    setServiceSearch('')
    setServiceTypeFilter('all')
    setServicePage(1)
    clearAll()
    onClose()
  }

  const handleSubmit = async () => {
    try {
      const documents = completedAttachments.map(a => ({
        title: a.name,
        fileUrl: a.url,
        fileName: a.name,
        fileSize: a.size,
        fileType: a.mimeType,
      }))

      const serviceIdsArray = Array.from(selectedServiceIds)

      await mutateAsync({
        condominiumId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        amount: formData.amount.trim(),
        currencyId: formData.currencyId,
        expenseDate: formData.expenseDate,
        serviceIds: serviceIdsArray.length > 0 ? serviceIdsArray : undefined,
        vendorName: vendorMode === 'manual' ? formData.vendorName.trim() || undefined : undefined,
        vendorTaxId:
          vendorMode === 'manual' && formData.vendorTaxIdType && formData.vendorTaxIdNumber.trim()
            ? `${formData.vendorTaxIdType}-${formData.vendorTaxIdNumber.trim()}`
            : undefined,
        vendorType: vendorMode === 'manual' ? formData.vendorType || undefined : undefined,
        vendorPhone:
          vendorMode === 'manual' && formData.vendorPhoneNumber.trim()
            ? `${formData.vendorPhoneCountryCode || '+58'}${formData.vendorPhoneNumber.trim()}`
            : undefined,
        vendorEmail: vendorMode === 'manual' ? formData.vendorEmail.trim() || undefined : undefined,
        vendorAddress:
          vendorMode === 'manual' ? formData.vendorAddress.trim() || undefined : undefined,
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        documents: documents.length > 0 ? documents : undefined,
      })
      toast.success(t.success)
      handleClose()
    } catch {
      toast.error('Error')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step renderers
  // ─────────────────────────────────────────────────────────────────────────

  const renderChargeInfoStep = () => (
    <div className="flex flex-col gap-5">
      <Input
        isRequired
        label={t.name}
        placeholder={t.namePlaceholder}
        value={formData.name}
        variant="bordered"
        onValueChange={v => updateForm({ name: v })}
      />
      <Textarea
        label={t.description}
        minRows={2}
        placeholder={t.descriptionPlaceholder}
        value={formData.description}
        variant="bordered"
        onValueChange={v => updateForm({ description: v })}
      />
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex-1">
          <Select
            items={currencyItems}
            label={t.currency}
            value={formData.currencyId}
            variant="bordered"
            onChange={key => key && updateForm({ currencyId: key })}
          />
        </div>
        <div className="flex-1">
          <CurrencyInput
            isRequired
            currencySymbol={currencySymbol}
            label={t.amount}
            placeholder="0,00"
            value={formData.amount}
            variant="bordered"
            onValueChange={v => updateForm({ amount: v })}
          />
        </div>
      </div>
      <Input
        isRequired
        label={t.expenseDate}
        type="date"
        value={formData.expenseDate}
        variant="bordered"
        onValueChange={v => updateForm({ expenseDate: v })}
      />
    </div>
  )

  const renderVendorStep = () => (
    <div className="flex flex-col gap-4">
      <Tabs
        fullWidth
        selectedKey={vendorMode}
        variant="bordered"
        onSelectionChange={key => setVendorMode(key as TVendorMode)}
      >
        <Tab key="existing" title={t.vendor.selectExisting}>
          <div className="flex flex-col gap-4 pt-2">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  placeholder={t.vendor.selectPlaceholder}
                  size="sm"
                  value={serviceSearch}
                  variant="bordered"
                  onValueChange={v => {
                    setServiceSearch(v)
                    setServicePage(1)
                  }}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  items={providerTypeFilterItems}
                  size="sm"
                  value={serviceTypeFilter}
                  variant="bordered"
                  onChange={key => {
                    if (key) {
                      setServiceTypeFilter(key)
                      setServicePage(1)
                    }
                  }}
                />
              </div>
            </div>

            {/* Selected count */}
            {selectedServiceIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Chip color="primary" size="sm" variant="flat">
                  {selectedServiceIds.size} {t.vendor.selected}
                </Chip>
                <Button size="sm" variant="light" onPress={() => setSelectedServiceIds(new Set())}>
                  <X size={14} />
                </Button>
              </div>
            )}

            {/* Table */}
            <Table<IServiceRow>
              isCompact
              removeWrapper
              aria-label="Services"
              columns={serviceColumns}
              emptyContent={
                <Typography className="py-4" color="muted" variant="body2">
                  {t.vendor.noServices}
                </Typography>
              }
              isLoading={servicesLoading}
              renderCell={renderServiceCell}
              rows={serviceRows}
              selectedKeys={selectedServiceIds}
              selectionMode="multiple"
              onSelectionChange={handleServiceSelectionChange}
            />

            {/* Pagination */}
            {servicesPagination.totalPages > 1 && (
              <Pagination
                limit={servicesPagination.limit}
                page={servicesPagination.page}
                showLimitSelector={false}
                total={servicesPagination.total}
                totalPages={servicesPagination.totalPages}
                onPageChange={setServicePage}
              />
            )}
          </div>
        </Tab>

        <Tab key="manual" title={t.vendor.manualEntry}>
          <div className="flex flex-col gap-5 pt-2">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex-1">
                <Select
                  isRequired
                  items={vendorTypeItems}
                  label={t.vendor.type}
                  placeholder={t.vendor.type}
                  value={formData.vendorType}
                  variant="bordered"
                  onChange={key =>
                    key && updateForm({ vendorType: key as 'individual' | 'company' })
                  }
                />
              </div>
              <div className="flex-1">
                <TaxIdInput
                  label={t.vendor.taxId}
                  taxIdNumber={formData.vendorTaxIdNumber}
                  taxIdType={(formData.vendorTaxIdType as TTaxIdType) || null}
                  variant="bordered"
                  onTaxIdNumberChange={v => updateForm({ vendorTaxIdNumber: v })}
                  onTaxIdTypeChange={type => updateForm({ vendorTaxIdType: type ?? '' })}
                />
              </div>
            </div>
            <Input
              isRequired
              label={t.vendor.name}
              placeholder={t.vendor.namePlaceholder}
              value={formData.vendorName}
              variant="bordered"
              onValueChange={v => updateForm({ vendorName: v })}
            />
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex-1">
                <PhoneInput
                  countryCode={formData.vendorPhoneCountryCode || null}
                  label={t.vendor.phone}
                  phoneNumber={formData.vendorPhoneNumber}
                  variant="bordered"
                  onCountryCodeChange={code => updateForm({ vendorPhoneCountryCode: code ?? '' })}
                  onPhoneNumberChange={v => updateForm({ vendorPhoneNumber: v })}
                />
              </div>
              <div className="flex-1">
                <Input
                  label={t.vendor.email}
                  type="email"
                  value={formData.vendorEmail}
                  variant="bordered"
                  onValueChange={v => updateForm({ vendorEmail: v })}
                />
              </div>
            </div>
            <Textarea
              label={t.vendor.address}
              minRows={2}
              placeholder={t.vendor.addressPlaceholder}
              value={formData.vendorAddress}
              variant="bordered"
              onValueChange={v => updateForm({ vendorAddress: v })}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  )

  const renderDocumentsStep = () => (
    <div className="flex flex-col gap-5">
      {/* Upload zone */}
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary-50'
            : 'border-default-300 hover:border-default-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="mb-2 text-default-400" size={32} />
        <Typography color="muted" variant="body2">
          {t.documents.uploadHint}
        </Typography>
        <Typography className="mt-1" color="muted" variant="caption">
          {t.documents.allowedTypes} · {t.documents.maxSize}
        </Typography>
        <input
          ref={fileInputRef}
          multiple
          accept={EXPENSE_ACCEPT_STRING}
          className="hidden"
          type="file"
          onChange={handleFileSelect}
        />
      </div>

      {/* File list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(file => (
            <div key={file.id} className="flex items-center gap-3 rounded-lg bg-default-100 p-3">
              {file.file.type.startsWith('image/') ? (
                <ImageIcon className="text-primary shrink-0" size={20} />
              ) : (
                <FileText className="text-warning shrink-0" size={20} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.file.name}</p>
                <p className="text-xs text-default-400">{formatFileSize(file.file.size)}</p>
                {(file.status === 'uploading' || file.status === 'pending') && (
                  <Progress className="mt-1" color="primary" size="sm" value={file.progress} />
                )}
                {file.status === 'error' && (
                  <p className="text-xs text-danger mt-1">{file.error}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {file.status === 'error' && (
                  <Button isIconOnly size="sm" variant="light" onPress={() => retryFile(file.id)}>
                    <RefreshCw size={14} />
                  </Button>
                )}
                {file.status === 'completed' && <Check className="text-success" size={16} />}
                <Button isIconOnly size="sm" variant="light" onPress={() => removeFile(file.id)}>
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Input
        label={t.documents.invoiceNumber}
        value={formData.invoiceNumber}
        variant="bordered"
        onValueChange={v => updateForm({ invoiceNumber: v })}
      />
      <Textarea
        label={t.documents.notes}
        minRows={2}
        value={formData.notes}
        variant="bordered"
        onValueChange={v => updateForm({ notes: v })}
      />
    </div>
  )

  const renderReviewStep = () => {
    const currencyDisplay = currencies.find(c => c.id === formData.currencyId)
    const currencyLabel = currencyDisplay
      ? `${currencyDisplay.symbol ?? ''} ${currencyDisplay.code}`.trim()
      : ''
    const hasManualVendor =
      vendorMode === 'manual' &&
      (formData.vendorName || formData.vendorTaxIdNumber || formData.vendorType)
    const hasSelectedServices = vendorMode === 'existing' && selectedServiceIds.size > 0

    return (
      <div className="flex flex-col gap-4">
        {/* Charge info */}
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t.review.chargeInfo}
            </Typography>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-default-500">{t.name}:</span>
              <span>{formData.name}</span>
              {formData.description && (
                <>
                  <span className="text-default-500">{t.description}:</span>
                  <span>{formData.description}</span>
                </>
              )}
              <span className="text-default-500">{t.amount}:</span>
              <span>
                {currencyLabel}{' '}
                {formData.amount
                  ? parseFloat(formData.amount).toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '0,00'}
              </span>
              <span className="text-default-500">{t.expenseDate}:</span>
              <span>
                {formData.expenseDate
                  ? new Date(formData.expenseDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Vendor info */}
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t.review.vendorInfo}
            </Typography>
            {hasSelectedServices ? (
              <div className="flex flex-wrap gap-2">
                {selectedServiceNames.map((name, i) => (
                  <Chip key={i} color="primary" size="sm" variant="flat">
                    {name}
                  </Chip>
                ))}
              </div>
            ) : hasManualVendor ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {formData.vendorType && (
                  <>
                    <span className="text-default-500">{t.vendor.type}:</span>
                    <span>
                      {formData.vendorType === 'individual'
                        ? t.vendor.individual
                        : t.vendor.company}
                    </span>
                  </>
                )}
                {formData.vendorName && (
                  <>
                    <span className="text-default-500">{t.vendor.name}:</span>
                    <span>{formData.vendorName}</span>
                  </>
                )}
                {formData.vendorTaxIdNumber && (
                  <>
                    <span className="text-default-500">{t.vendor.taxId}:</span>
                    <span>
                      {formData.vendorTaxIdType
                        ? `${formData.vendorTaxIdType}-${formData.vendorTaxIdNumber}`
                        : formData.vendorTaxIdNumber}
                    </span>
                  </>
                )}
                {formData.vendorPhoneNumber && (
                  <>
                    <span className="text-default-500">{t.vendor.phone}:</span>
                    <span>
                      {formData.vendorPhoneCountryCode || '+58'} {formData.vendorPhoneNumber}
                    </span>
                  </>
                )}
                {formData.vendorEmail && (
                  <>
                    <span className="text-default-500">{t.vendor.email}:</span>
                    <span>{formData.vendorEmail}</span>
                  </>
                )}
                {formData.vendorAddress && (
                  <>
                    <span className="text-default-500">{t.vendor.address}:</span>
                    <span>{formData.vendorAddress}</span>
                  </>
                )}
              </div>
            ) : (
              <Typography color="muted" variant="body2">
                {t.review.noVendor}
              </Typography>
            )}
          </CardBody>
        </Card>

        {/* Documents */}
        <Card>
          <CardBody className="space-y-2">
            <Typography className="font-semibold" variant="body2">
              {t.review.attachedDocs}
            </Typography>
            {completedAttachments.length > 0 ? (
              <div className="space-y-1">
                {completedAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {a.mimeType.startsWith('image/') ? (
                      <ImageIcon className="text-primary" size={14} />
                    ) : (
                      <FileText className="text-warning" size={14} />
                    )}
                    <span>{a.name}</span>
                    <span className="text-default-400">({formatFileSize(a.size)})</span>
                  </div>
                ))}
              </div>
            ) : (
              <Typography color="muted" variant="body2">
                {t.review.noDocs}
              </Typography>
            )}
            {formData.invoiceNumber && (
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <span className="text-default-500">{t.documents.invoiceNumber}:</span>
                <span>{formData.invoiceNumber}</span>
              </div>
            )}
            {formData.notes && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-default-500">{t.documents.notes}:</span>
                <span>{formData.notes}</span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderChargeInfoStep()
      case 1:
        return renderVendorStep()
      case 2:
        return renderDocumentsStep()
      case 3:
        return renderReviewStep()
      default:
        return null
    }
  }

  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="3xl" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-4">
          <Typography variant="h4">{t.title}</Typography>
          <Stepper
            hideLabelsOnMobile
            color="primary"
            currentStep={STEPS[currentStep]!}
            size="sm"
            steps={wizardSteps}
          />
        </ModalHeader>

        <ModalBody>{renderStepContent()}</ModalBody>

        <ModalFooter className="justify-end">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                isDisabled={isPending}
                startContent={<ChevronLeft size={16} />}
                variant="flat"
                onPress={handlePrevious}
              >
                {t.navigation.previous}
              </Button>
            )}
            {isLastStep ? (
              <Button
                color="primary"
                isDisabled={!canProceed()}
                isLoading={isPending}
                startContent={!isPending ? <Check size={16} /> : undefined}
                onPress={handleSubmit}
              >
                {isPending ? t.submitting : t.submit}
              </Button>
            ) : (
              <Button
                color="primary"
                endContent={<ChevronRight size={16} />}
                isDisabled={!canProceed()}
                onPress={handleNext}
              >
                {t.navigation.next}
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
