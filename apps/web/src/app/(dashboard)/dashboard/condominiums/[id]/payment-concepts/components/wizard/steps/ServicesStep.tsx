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
import { Plus, Trash2, Wrench, Search, Check, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { IWizardFormData, IWizardService } from '../CreatePaymentConceptWizard'
import { CreateServiceModal } from '../../../../services/components/CreateServiceModal'
import { useCondominiumServicesPaginated, useMyLatestExchangeRates } from '@packages/http-client/hooks'

export interface ServicesStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  condominiumId: string
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  showErrors: boolean
}

interface IApiService {
  id: string
  name: string
  providerType: string
  defaultAmount: string | null
  currencyId: string
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
}: ServicesStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.services.conceptServices'

  const selectorModal = useDisclosure()
  const createModal = useDisclosure()

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

  // Fetch exchange rates for cross-currency conversion
  const { data: ratesResponse } = useMyLatestExchangeRates({ enabled: selectorModal.isOpen })
  const rates = useMemo(() => ratesResponse?.data ?? [], [ratesResponse])

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

  // ─── Exchange rate helpers ─────────────────────────────────────────────────

  const findRate = useCallback(
    (fromCurrencyId: string, toCurrencyId: string): number | null => {
      const direct = rates.find(
        r => r.fromCurrencyId === fromCurrencyId && r.toCurrencyId === toCurrencyId
      )
      if (direct) return Number(direct.rate)

      const inverse = rates.find(
        r => r.fromCurrencyId === toCurrencyId && r.toCurrencyId === fromCurrencyId
      )
      if (inverse) return 1 / Number(inverse.rate)

      return null
    },
    [rates]
  )

  const getCurrencyCode = useCallback(
    (currencyId: string) => currencies.find(c => c.id === currencyId)?.code ?? '',
    [currencies]
  )

  // ─── Modal handlers ────────────────────────────────────────────────────────

  const getModalAmount = useCallback(
    (service: IApiService): string => {
      if (modalAmounts[service.id] !== undefined) return modalAmounts[service.id]!

      const isDiffCurrency = formData.currencyId && service.currencyId !== formData.currencyId

      if (isDiffCurrency && service.defaultAmount) {
        const rate = findRate(service.currencyId, formData.currencyId!)
        if (rate !== null) return (Number(service.defaultAmount) * rate).toFixed(2)
        return ''
      }

      return service.defaultAmount ? Number(service.defaultAmount).toFixed(2) : ''
    },
    [modalAmounts, formData.currencyId, findRate]
  )

  const handleModalAmountChange = useCallback((serviceId: string, value: string) => {
    setModalAmounts(prev => ({ ...prev, [serviceId]: value }))
  }, [])

  const handleSelectService = useCallback(
    (service: IApiService) => {
      if (addedServiceIds.has(service.id)) return

      const isDiffCurrency = formData.currencyId && service.currencyId !== formData.currencyId
      const overriddenAmount = modalAmounts[service.id]

      let finalAmount: number
      let originalDefault: number | undefined
      let isDefault: boolean

      if (isDiffCurrency) {
        // Cross-currency: amount is always in the target currency (converted)
        finalAmount = overriddenAmount !== undefined ? Number(overriddenAmount) : 0
        if (!overriddenAmount && service.defaultAmount) {
          const rate = findRate(service.currencyId, formData.currencyId!)
          if (rate !== null) finalAmount = Number(service.defaultAmount) * rate
        }
        // Converted amounts are never "default"
        isDefault = false
        originalDefault = undefined
      } else {
        const defaultAmt = service.defaultAmount ? Number(service.defaultAmount) : 0
        finalAmount = overriddenAmount !== undefined ? Number(overriddenAmount) : defaultAmt
        isDefault = overriddenAmount === undefined && !!service.defaultAmount
        originalDefault = defaultAmt || undefined
      }

      const newService: IWizardService = {
        serviceId: service.id,
        serviceName: service.name,
        amount: finalAmount || 0,
        useDefaultAmount: isDefault,
        originalDefaultAmount: originalDefault,
      }

      onUpdate({ services: [...formData.services, newService] })
      setModalAmounts(prev => {
        const copy = { ...prev }
        delete copy[service.id]
        return copy
      })
    },
    [addedServiceIds, formData.services, formData.currencyId, modalAmounts, onUpdate, findRate]
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
        const isDefault = s.originalDefaultAmount != null && numAmount === s.originalDefaultAmount
        return { ...s, amount: numAmount, useDefaultAmount: isDefault }
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

  return (
    <div className="flex flex-col gap-5">
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      {/* Add service button */}
      <div className="flex flex-col gap-4 rounded-lg border border-default-200 p-4">
        <div className="flex items-center justify-between">
          <Typography variant="body2" className="font-semibold">
            {t(`${w}.addService`)}
          </Typography>
          <Button
            color="success"
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
            {formData.services.map((service, index) => (
              <div
                key={service.serviceId}
                className="group flex items-center gap-3 rounded-lg border border-default-200 p-3 transition-colors hover:border-default-300"
              >
                <Wrench size={18} className="shrink-0 text-default-400" />
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="text-sm font-medium truncate">{service.serviceName}</span>
                  {service.useDefaultAmount && (
                    <Chip size="sm" variant="flat" color="success">
                      {t(`${w}.useDefault`)}
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
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onPress={() => handleRemoveService(index)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
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

      {showErrors && formData.services.length === 0 && (
        <Typography variant="caption" color="danger">
          {t(`${w}.required`)}
        </Typography>
      )}

      {/* ─── Service Selector Modal ─────────────────────────────────────────── */}
      <Modal isOpen={selectorModal.isOpen} onClose={selectorModal.onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-3 px-8">
            <div className="flex items-center justify-between">
              <Typography variant="h4">{t(`${w}.addService`)}</Typography>
              <Button
                color="success"
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
                  const isDifferentCurrency = !!(formData.currencyId && service.currencyId !== formData.currencyId)
                  const rate = isDifferentCurrency
                    ? findRate(service.currencyId, formData.currencyId!)
                    : null
                  const hasNoRate = isDifferentCurrency && rate === null
                  const effectiveAmount = getModalAmount(service)
                  const canAdd = !isAdded && !hasNoRate && !!effectiveAmount && Number(effectiveAmount) > 0

                  const serviceCurrencyCode = getCurrencyCode(service.currencyId)
                  const targetCurrencyCode = formData.currencyId ? getCurrencyCode(formData.currencyId) : ''

                  return (
                    <div
                      key={service.id}
                      className={`flex flex-col gap-3 rounded-lg border p-4 transition-all ${
                        isAdded
                          ? 'border-success-300 bg-success-50'
                          : hasNoRate
                            ? 'border-default-200 bg-default-50 opacity-50'
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
                        <div className="flex items-center gap-2 pl-6">
                          <Check size={16} className="text-success" />
                          <Typography variant="caption" color="success">
                            {t('common.added')}
                          </Typography>
                        </div>
                      ) : hasNoRate ? (
                        <div className="pl-6">
                          <Typography variant="caption" color="warning">
                            {t(`${w}.noRateAvailable`)}
                          </Typography>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 pl-6">
                          {/* Conversion info for different currencies */}
                          {isDifferentCurrency && rate !== null && service.defaultAmount && (
                            <div className="flex items-center gap-1.5 text-xs text-default-500">
                              <span>
                                {serviceCurrencyCode} {Number(service.defaultAmount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </span>
                              <ArrowRight size={12} />
                              <span>
                                {targetCurrencyCode} {(Number(service.defaultAmount) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-default-400">
                                ({t(`${w}.rate`)}: {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })})
                              </span>
                            </div>
                          )}
                          <div className="flex items-end gap-2">
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
                              color="success"
                              variant="flat"
                              isDisabled={!canAdd}
                              onPress={() => handleSelectService(service)}
                              startContent={<Plus size={14} />}
                            >
                              {t('common.add')}
                            </Button>
                          </div>
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
    </div>
  )
}
