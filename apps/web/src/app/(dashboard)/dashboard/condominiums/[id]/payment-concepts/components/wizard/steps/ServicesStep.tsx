'use client'

import { useState, useMemo, useCallback } from 'react'
import { CurrencyInput } from '@/ui/components/input'
import { Input } from '@/ui/components/input'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Pagination } from '@/ui/components/pagination'
import { Divider } from '@/ui/components/divider'
import { Plus, Trash2, Wrench, Search, Check, Receipt, CheckCircle2, X } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { TWizardExecutionData } from '@packages/domain'
import type { IWizardFormData, IWizardService } from '../CreatePaymentConceptWizard'
import { CreateServiceModal } from '../../../../services/components/CreateServiceModal'
import { ExecutionModal } from '../../../../services/components/ExecutionModal'
import { useCondominiumServicesPaginated } from '@packages/http-client/hooks'

export interface ServicesStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  condominiumId: string
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  showErrors: boolean
  servicesRequired: boolean
}

interface IApiService {
  id: string
  name: string
  providerType: string
  legalName?: string | null
  email?: string | null
  phone?: string | null
  isActive?: boolean
}

const PROVIDER_TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'warning' | 'danger' | 'default'> = {
  individual: 'primary',
  company: 'secondary',
  cooperative: 'warning',
  government: 'danger',
  internal: 'default',
}

export function ServicesStep({
  formData,
  onUpdate,
  condominiumId,
  managementCompanyId,
  currencies,
  showErrors,
  servicesRequired,
}: ServicesStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.services.conceptServices'

  const selectorModal = useDisclosure()
  const createModal = useDisclosure()

  // ─── Execution panel state ─────────────────────────────────────────────────
  const [executionTarget, setExecutionTarget] = useState<{
    serviceId: string
    serviceName: string
    existingExecution?: TWizardExecutionData
  } | null>(null)

  // ─── Selector modal state ──────────────────────────────────────────────────
  const [selectorSearch, setSelectorSearch] = useState('')
  const [selectorProviderType, setSelectorProviderType] = useState<string>('all')
  const [selectorPage, setSelectorPage] = useState(1)
  const [modalAmounts, setModalAmounts] = useState<Record<string, string>>({})
  const SELECTOR_LIMIT = 6

  // Fetch services for selector modal
  const { data: selectorData, isLoading: selectorLoading, refetch } = useCondominiumServicesPaginated({
    companyId: managementCompanyId,
    condominiumId,
    query: {
      page: selectorPage,
      limit: SELECTOR_LIMIT,
      isActive: true,
      search: selectorSearch || undefined,
      providerType: selectorProviderType === 'all' ? undefined : selectorProviderType,
    },
    enabled: !!managementCompanyId && selectorModal.isOpen,
  })

  const selectorServices = useMemo(() => (selectorData?.data ?? []) as IApiService[], [selectorData])
  const selectorPagination = selectorData?.pagination ?? { page: 1, limit: SELECTOR_LIMIT, total: 0, totalPages: 0 }

  const addedServiceIds = useMemo(
    () => new Set(formData.services.map(s => s.serviceId)),
    [formData.services]
  )

  const currencySymbol = useMemo(() => {
    if (!formData.currencyId) return ''
    const cur = currencies.find(c => c.id === formData.currencyId)
    return cur?.symbol || cur?.code || ''
  }, [formData.currencyId, currencies])

  const currencySymbolNode = currencySymbol ? (
    <span className="text-default-400 text-sm">{currencySymbol}</span>
  ) : undefined

  const providerTypeItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.condominiums.detail.services.filters.allTypes') },
      { key: 'individual', label: t('admin.condominiums.detail.services.providerTypes.individual') },
      { key: 'company', label: t('admin.condominiums.detail.services.providerTypes.company') },
      { key: 'cooperative', label: t('admin.condominiums.detail.services.providerTypes.cooperative') },
      { key: 'government', label: t('admin.condominiums.detail.services.providerTypes.government') },
      { key: 'internal', label: t('admin.condominiums.detail.services.providerTypes.internal') },
    ],
    [t]
  )

  // ─── Modal handlers ────────────────────────────────────────────────────────

  const getModalAmount = useCallback(
    (service: IApiService): string => {
      return modalAmounts[service.id] ?? ''
    },
    [modalAmounts]
  )

  const handleModalAmountChange = useCallback((serviceId: string, value: string) => {
    setModalAmounts(prev => ({ ...prev, [serviceId]: value }))
  }, [])

  const handleSelectService = useCallback(
    (service: IApiService) => {
      if (addedServiceIds.has(service.id)) return

      const amount = Number(modalAmounts[service.id] ?? 0)

      const newService: IWizardService = {
        serviceId: service.id,
        serviceName: service.name,
        amount: amount || 0,
      }

      onUpdate({ services: [...formData.services, newService], fixedAmount: 0 })
      setModalAmounts(prev => {
        const copy = { ...prev }
        delete copy[service.id]
        return copy
      })
    },
    [addedServiceIds, formData.services, modalAmounts, onUpdate]
  )

  const handleDeselectService = useCallback(
    (serviceId: string) => {
      const index = formData.services.findIndex(s => s.serviceId === serviceId)
      if (index !== -1) {
        const updated = formData.services.filter((_, i) => i !== index)
        onUpdate({ services: updated })
      }
    },
    [formData.services, onUpdate]
  )

  // ─── Step view handlers ────────────────────────────────────────────────────

  const handleRemoveService = useCallback(
    (index: number) => {
      const updated = formData.services.filter((_, i) => i !== index)
      onUpdate({ services: updated })
    },
    [formData.services, onUpdate]
  )

  const handleUpdateServiceAmount = useCallback(
    (index: number, amount: string) => {
      const numAmount = Number(amount) || 0
      const updated = formData.services.map((s, i) => {
        if (i !== index) return s
        return { ...s, amount: numAmount }
      })
      onUpdate({ services: updated })
    },
    [formData.services, onUpdate]
  )

  const totalAmount = useMemo(
    () => formData.services.reduce((sum, s) => sum + s.amount, 0),
    [formData.services]
  )

  const formatAmount = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`

  const handleSaveExecution = useCallback(
    (data: TWizardExecutionData) => {
      if (!executionTarget) return
      const updated = formData.services.map(s =>
        s.serviceId === executionTarget.serviceId ? { ...s, execution: data } : s
      )
      onUpdate({ services: updated })
    },
    [executionTarget, formData.services, onUpdate]
  )

  const handleServiceCreated = useCallback(() => {
    refetch()
  }, [refetch])

  const handleOpenSelector = useCallback(() => {
    setSelectorSearch('')
    setSelectorProviderType('all')
    setSelectorPage(1)
    setModalAmounts({})
    selectorModal.onOpen()
  }, [selectorModal])

  const handleSelectorSearchChange = useCallback((value: string) => {
    setSelectorSearch(value)
    setSelectorPage(1)
  }, [])

  const handleSelectorProviderTypeChange = useCallback((key: string | null) => {
    if (key) {
      setSelectorProviderType(key)
      setSelectorPage(1)
    }
  }, [])

  const handleFixedAmountChange = useCallback(
    (value: string) => {
      onUpdate({ fixedAmount: Number(value) || 0 })
    },
    [onUpdate]
  )

  return (
    <div className="flex flex-col gap-5">
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      {/* Fixed amount section — only for non-maintenance types */}
      {!servicesRequired && (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-default-200 p-4">
            <CurrencyInput
              label={t(`${w}.fixedAmountLabel`)}
              value={String(formData.fixedAmount || '')}
              onValueChange={handleFixedAmountChange}
              currencySymbol={currencySymbolNode}
              showCurrencySymbol={!!currencySymbol}
              variant="bordered"
              isDisabled={formData.services.length > 0}
              description={t(`${w}.fixedAmountDescription`)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Divider className="flex-1" />
            <Typography variant="caption" color="muted">
              {t(`${w}.orLinkServices`)}
            </Typography>
            <Divider className="flex-1" />
          </div>
        </>
      )}

      {/* Add service button */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <div className="flex items-center justify-between">
          <Typography variant="body2" className="font-semibold">
            {t(`${w}.addService`)}
          </Typography>
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus size={16} />}
            onPress={handleOpenSelector}
          >
            {t(`${w}.addService`)}
          </Button>
        </div>

        {formData.services.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Wrench className="text-default-300" size={36} />
            <Typography variant="body2" color="muted" className="text-center">
              {t(`${w}.empty`)}
            </Typography>
          </div>
        )}
      </div>

      {/* Added services list */}
      {formData.services.length > 0 && (
        <div className="flex flex-col gap-3">
          <Typography variant="body2" className="font-semibold">
            {t(`${w}.title`)} ({formData.services.length})
          </Typography>

          <div className="flex flex-col gap-2">
            {formData.services.map((service, index) => {
              const hasExecution = !!service.execution
              return (
                <div
                  key={service.serviceId}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    hasExecution
                      ? 'border-success-200 bg-success-50/30'
                      : showErrors
                        ? 'border-danger-300 bg-danger-50/30'
                        : 'border-default-200 hover:border-default-300'
                  }`}
                >
                  <Wrench size={18} className="shrink-0 text-default-400" />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-sm font-medium truncate">{service.serviceName}</span>
                    {hasExecution && (
                      <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle2 size={12} />}>
                        {t(`${w}.executionRegistered`)}
                      </Chip>
                    )}
                  </div>
                  <CurrencyInput
                    value={String(service.amount)}
                    onValueChange={v => handleUpdateServiceAmount(index, v)}
                    currencySymbol={currencySymbolNode}
                    showCurrencySymbol={!!currencySymbol}
                    variant="bordered"
                    className="w-36"
                    size="sm"
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    color={hasExecution ? 'success' : 'primary'}
                    className="shrink-0"
                    startContent={hasExecution ? <CheckCircle2 size={14} /> : <Receipt size={14} />}
                    onPress={() => setExecutionTarget({
                      serviceId: service.serviceId,
                      serviceName: service.serviceName,
                      existingExecution: service.execution,
                    })}
                  >
                    {hasExecution ? t(`${w}.editExecution`) : t(`${w}.addExecution`)}
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    className="shrink-0"
                    onPress={() => handleRemoveService(index)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Total */}
          <div className="flex items-center justify-end gap-2 rounded-lg bg-default-100 p-3">
            <Typography variant="body2" className="font-semibold">
              {t(`${w}.total`)}:
            </Typography>
            <Typography variant="body1" className="font-bold">
              {formatAmount(totalAmount)}
            </Typography>
          </div>
        </div>
      )}

      {showErrors && formData.services.length === 0 && (servicesRequired || formData.fixedAmount <= 0) && (
        <Typography variant="caption" color="danger">
          {servicesRequired ? t(`${w}.required`) : t(`${w}.fixedAmountOrServicesRequired`)}
        </Typography>
      )}

      {showErrors && formData.services.length > 0 && formData.services.some(s => !s.execution) && (
        <Typography variant="caption" color="danger">
          {t(`${w}.executionRequired`)}
        </Typography>
      )}

      {/* ─── Service Selector Modal ─────────────────────────────────────────── */}
      <Modal isOpen={selectorModal.isOpen} onClose={selectorModal.onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-3 px-8">
            <div className="flex items-center justify-between">
              <Typography variant="h4">{t(`${w}.addService`)}</Typography>
              <Button
                color="primary"
                variant="flat"
                size="sm"
                startContent={<Plus size={14} />}
                onPress={createModal.onOpen}
              >
                {t('admin.condominiums.detail.services.wizard.title')}
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder={t('admin.condominiums.detail.services.filters.searchPlaceholder')}
                value={selectorSearch}
                onValueChange={handleSelectorSearchChange}
                startContent={<Search size={16} className="text-default-400" />}
                className="flex-1"
                variant="bordered"
                isClearable
                onClear={() => handleSelectorSearchChange('')}
                size="sm"
              />
              <Select
                aria-label={t('admin.condominiums.detail.services.table.providerType')}
                className="w-full sm:w-44"
                items={providerTypeItems}
                value={selectorProviderType}
                onChange={handleSelectorProviderTypeChange}
                variant="bordered"
                size="sm"
              />
            </div>
          </ModalHeader>

          <ModalBody className="max-h-[60vh] px-8">
            {selectorLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : selectorServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Wrench className="text-default-300" size={48} />
                <Typography color="muted" variant="body1">
                  {t('admin.condominiums.detail.services.noResults')}
                </Typography>
                <Typography color="muted" variant="body2">
                  {t('admin.condominiums.detail.services.noResultsHint')}
                </Typography>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectorServices.map(service => {
                  const isAdded = addedServiceIds.has(service.id)
                  const effectiveAmount = getModalAmount(service)
                  const canAdd = !isAdded && !!effectiveAmount && Number(effectiveAmount) > 0

                  return (
                    <div
                      key={service.id}
                      className={`flex flex-col gap-3 rounded-lg border p-4 transition-all ${
                        isAdded
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-default-200 hover:border-default-300'
                      }`}
                    >
                      {/* Service info */}
                      <div className="flex items-start gap-2">
                        <Wrench size={16} className="mt-0.5 shrink-0 text-default-400" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{service.name}</span>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={PROVIDER_TYPE_COLORS[service.providerType] || 'default'}
                            >
                              {t(`admin.condominiums.detail.services.providerTypes.${service.providerType}`)}
                            </Chip>
                          </div>
                          {service.legalName && (
                            <span className="text-xs text-default-500">{service.legalName}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount + Action */}
                      {isAdded ? (
                        <div className="flex items-center justify-between pl-6">
                          <div className="flex items-center gap-2">
                            <Check size={16} className="text-primary" />
                            <Typography variant="caption" color="primary">
                              {t('common.added')}
                            </Typography>
                          </div>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            onPress={() => handleDeselectService(service.id)}
                            startContent={<X size={14} />}
                          >
                            {t('common.remove')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-end gap-2 pl-6">
                          <CurrencyInput
                            value={effectiveAmount}
                            onValueChange={v => handleModalAmountChange(service.id, v)}
                            currencySymbol={currencySymbolNode}
                            showCurrencySymbol={!!currencySymbol}
                            variant="bordered"
                            className="flex-1"
                            size="sm"
                          />
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            isDisabled={!canAdd}
                            onPress={() => handleSelectService(service)}
                            startContent={<Plus size={14} />}
                          >
                            {t('common.add')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {selectorPagination.totalPages > 1 && (
                  <Pagination
                    page={selectorPagination.page}
                    total={selectorPagination.total}
                    totalPages={selectorPagination.totalPages}
                    limit={selectorPagination.limit}
                    onPageChange={setSelectorPage}
                  />
                )}
              </div>
            )}
          </ModalBody>

          <ModalFooter className="px-8">
            <Button variant="flat" onPress={selectorModal.onClose}>
              {t('common.close')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Service Modal */}
      <CreateServiceModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        condominiumId={condominiumId}
        managementCompanyId={managementCompanyId}
        onCreated={handleServiceCreated}
      />

      {/* Execution Modal — wizard mode: saves data locally */}
      {executionTarget && (
        <ExecutionModal
          isOpen={!!executionTarget}
          onClose={() => setExecutionTarget(null)}
          managementCompanyId={managementCompanyId}
          serviceId={executionTarget.serviceId}
          condominiumId={condominiumId}
          currencyId={formData.currencyId}
          onSaveLocal={handleSaveExecution}
          wizardExecution={executionTarget.existingExecution}
        />
      )}
    </div>
  )
}
