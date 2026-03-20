'use client'

import type { TWizardExecutionData } from '@packages/domain'
import type { IWizardFormData, IWizardService } from '../CreatePaymentConceptWizard'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Wrench, Search, Receipt, CheckCircle2 } from 'lucide-react'
import { useCondominiumServicesPaginated } from '@packages/http-client/hooks'

import { CreateServiceModal } from '../../../../services/components/CreateServiceModal'
import { ExecutionModal } from '../../../../services/components/ExecutionModal'

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
import { useTranslation } from '@/contexts'

export interface ServicesStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  condominiumId: string
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  showErrors: boolean
  servicesRequired: boolean
  isRecurring?: boolean
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

const PROVIDER_TYPE_COLORS: Record<
  string,
  'primary' | 'secondary' | 'warning' | 'danger' | 'default'
> = {
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
  isRecurring,
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectorProviderType, setSelectorProviderType] = useState<string>('all')
  const [selectorPage, setSelectorPage] = useState(1)
  const SELECTOR_LIMIT = 6
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(selectorSearch)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectorSearch])

  // Fetch services for selector modal
  const {
    data: selectorData,
    isLoading: selectorLoading,
    refetch,
  } = useCondominiumServicesPaginated({
    companyId: managementCompanyId,
    condominiumId,
    query: {
      page: selectorPage,
      limit: SELECTOR_LIMIT,
      isActive: true,
      search: debouncedSearch || undefined,
      providerType: selectorProviderType === 'all' ? undefined : selectorProviderType,
    },
    enabled: !!managementCompanyId && selectorModal.isOpen,
  })

  const selectorServices = useMemo(
    () => (selectorData?.data ?? []) as IApiService[],
    [selectorData]
  )
  const selectorPagination = selectorData?.pagination ?? {
    page: 1,
    limit: SELECTOR_LIMIT,
    total: 0,
    totalPages: 0,
  }

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
      {
        key: 'individual',
        label: t('admin.condominiums.detail.services.providerTypes.individual'),
      },
      { key: 'company', label: t('admin.condominiums.detail.services.providerTypes.company') },
      {
        key: 'cooperative',
        label: t('admin.condominiums.detail.services.providerTypes.cooperative'),
      },
      {
        key: 'government',
        label: t('admin.condominiums.detail.services.providerTypes.government'),
      },
      { key: 'internal', label: t('admin.condominiums.detail.services.providerTypes.internal') },
    ],
    [t]
  )

  // ─── Modal handlers ────────────────────────────────────────────────────────

  const handleSelectService = useCallback(
    (service: IApiService) => {
      if (addedServiceIds.has(service.id)) return

      const newService: IWizardService = {
        serviceId: service.id,
        serviceName: service.name,
        amount: 0,
      }

      onUpdate({ services: [...formData.services, newService], fixedAmount: 0 })
    },
    [addedServiceIds, formData.services, onUpdate]
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
        s.serviceId === executionTarget.serviceId
          ? { ...s, execution: data, amount: Number(data.totalAmount) || 0 }
          : s
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
    setDebouncedSearch('')
    setSelectorProviderType('all')
    setSelectorPage(1)
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
      <Typography color="muted" variant="body2">
        {t(`${w}.description`)}
      </Typography>

      {/* Fixed amount section — only for non-maintenance types */}
      {!servicesRequired && (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-default-200 p-4">
            <CurrencyInput
              currencySymbol={currencySymbolNode}
              description={t(`${w}.fixedAmountDescription`)}
              isDisabled={formData.services.length > 0}
              label={t(`${w}.fixedAmountLabel`)}
              showCurrencySymbol={!!currencySymbol}
              value={String(formData.fixedAmount || '')}
              variant="bordered"
              onValueChange={handleFixedAmountChange}
            />
          </div>

          <div className="flex items-center gap-3">
            <Divider className="flex-1" />
            <Typography color="muted" variant="caption">
              {t(`${w}.orLinkServices`)}
            </Typography>
            <Divider className="flex-1" />
          </div>
        </>
      )}

      {/* Add service button */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <div className="flex items-center justify-between">
          <Typography className="font-semibold" variant="body2">
            {t(`${w}.addService`)}
          </Typography>
          <Button
            color="primary"
            startContent={<Plus size={16} />}
            variant="flat"
            onPress={handleOpenSelector}
          >
            {t(`${w}.addService`)}
          </Button>
        </div>

        {formData.services.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Wrench className="text-default-300" size={36} />
            <Typography className="text-center" color="muted" variant="body2">
              {t(`${w}.empty`)}
            </Typography>
          </div>
        )}
      </div>

      {/* Added services list */}
      {formData.services.length > 0 && (
        <div className="flex flex-col gap-3">
          <Typography className="font-semibold" variant="body2">
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
                  <Wrench className="shrink-0 text-default-400" size={18} />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-sm font-medium truncate">{service.serviceName}</span>
                    {hasExecution && (
                      <Chip
                        color="success"
                        size="sm"
                        startContent={<CheckCircle2 size={12} />}
                        variant="flat"
                      >
                        {t(`${w}.executionRegistered`)}
                      </Chip>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-medium text-default-600">
                    {service.amount > 0 ? formatAmount(service.amount) : '—'}
                  </span>
                  <Button
                    className="shrink-0"
                    color={hasExecution ? 'success' : 'primary'}
                    size="sm"
                    startContent={hasExecution ? <CheckCircle2 size={14} /> : <Receipt size={14} />}
                    variant="flat"
                    onPress={() =>
                      setExecutionTarget({
                        serviceId: service.serviceId,
                        serviceName: service.serviceName,
                        existingExecution: service.execution,
                      })
                    }
                  >
                    {hasExecution ? t(`${w}.editExecution`) : t(`${w}.addExecution`)}
                  </Button>
                  <Button
                    isIconOnly
                    className="shrink-0"
                    color="danger"
                    size="sm"
                    variant="light"
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
            <Typography className="font-semibold" variant="body2">
              {t(`${w}.total`)}:
            </Typography>
            <Typography className="font-bold" variant="body1">
              {formatAmount(totalAmount)}
            </Typography>
          </div>
        </div>
      )}

      {showErrors &&
        formData.services.length === 0 &&
        (servicesRequired || formData.fixedAmount <= 0) && (
          <Typography color="danger" variant="caption">
            {servicesRequired ? t(`${w}.required`) : t(`${w}.fixedAmountOrServicesRequired`)}
          </Typography>
        )}

      {showErrors && formData.services.length > 0 && formData.services.some(s => !s.execution) && (
        <Typography color="danger" variant="caption">
          {t(`${w}.executionRequired`)}
        </Typography>
      )}

      {/* ─── Service Selector Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={selectorModal.isOpen}
        scrollBehavior="inside"
        size="2xl"
        onClose={selectorModal.onClose}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-3 px-8">
            <div className="flex items-center justify-between">
              <Typography variant="h4">{t(`${w}.addService`)}</Typography>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={14} />}
                variant="flat"
                onPress={createModal.onOpen}
              >
                {t('admin.condominiums.detail.services.wizard.title')}
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                isClearable
                className="flex-1"
                placeholder={t('admin.condominiums.detail.services.filters.searchPlaceholder')}
                size="sm"
                startContent={<Search className="text-default-400" size={16} />}
                value={selectorSearch}
                variant="bordered"
                onClear={() => handleSelectorSearchChange('')}
                onValueChange={handleSelectorSearchChange}
              />
              <Select
                aria-label={t('admin.condominiums.detail.services.table.providerType')}
                className="w-full sm:w-44"
                items={providerTypeItems}
                size="sm"
                value={selectorProviderType}
                variant="bordered"
                onChange={handleSelectorProviderTypeChange}
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

                  return (
                    <div
                      key={service.id}
                      className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
                        isAdded
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-default-200 hover:border-default-300'
                      }`}
                    >
                      <Wrench className="shrink-0 text-default-400" size={16} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{service.name}</span>
                          <Chip
                            color={PROVIDER_TYPE_COLORS[service.providerType] || 'default'}
                            size="sm"
                            variant="flat"
                          >
                            {t(
                              `admin.condominiums.detail.services.providerTypes.${service.providerType}`
                            )}
                          </Chip>
                        </div>
                        {service.legalName && (
                          <span className="text-xs text-default-500">{service.legalName}</span>
                        )}
                      </div>

                      {isAdded ? (
                        <Button
                          isIconOnly
                          color="default"
                          size="sm"
                          variant="solid"
                          onPress={() => handleDeselectService(service.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      ) : (
                        <Button
                          color="primary"
                          size="sm"
                          startContent={<Plus size={14} />}
                          variant="flat"
                          onPress={() => handleSelectService(service)}
                        >
                          {t('common.add')}
                        </Button>
                      )}
                    </div>
                  )
                })}

                {selectorPagination.totalPages > 1 && (
                  <Pagination
                    limit={selectorPagination.limit}
                    page={selectorPagination.page}
                    total={selectorPagination.total}
                    totalPages={selectorPagination.totalPages}
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
        condominiumId={condominiumId}
        isOpen={createModal.isOpen}
        managementCompanyId={managementCompanyId}
        onClose={createModal.onClose}
        onCreated={handleServiceCreated}
      />

      {/* Execution Modal — wizard mode: saves data locally */}
      {executionTarget && (
        <ExecutionModal
          condominiumId={condominiumId}
          currencies={currencies}
          currencyId={formData.currencyId}
          isOpen={!!executionTarget}
          isRecurring={isRecurring}
          managementCompanyId={managementCompanyId}
          serviceId={executionTarget.serviceId}
          serviceName={executionTarget.serviceName}
          wizardExecution={executionTarget.existingExecution}
          onClose={() => setExecutionTarget(null)}
          onSaveLocal={handleSaveExecution}
        />
      )}
    </div>
  )
}
