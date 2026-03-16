'use client'

import type { TServiceExecution, TCurrency } from '@packages/domain'

import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@packages/http-client/hooks'
import {
  Wrench,
  Plus,
  Trash2,
  Ban,
  AlertTriangle,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Percent,
  FileText,
  ExternalLink,
  Image,
  Calendar,
  Hash,
  ArrowLeftRight,
} from 'lucide-react'
import {
  useCondominiumServiceDetail,
  useDeactivateCondominiumService,
  useServiceExecutionsPaginated,
  useDeleteServiceExecution,
  useActiveCurrencies,
  serviceExecutionKeys,
  condominiumServiceKeys,
} from '@packages/http-client/hooks'

import { ExecutionModal } from '../../components/ExecutionModal'

import { ExchangeRateModal } from './ExchangeRateModal'

import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { useDisclosure } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

const PROVIDER_TYPE_COLORS = {
  individual: 'primary',
  company: 'secondary',
  cooperative: 'warning',
  government: 'danger',
  internal: 'default',
} as const

interface ServiceDetailPageClientProps {
  condominiumId: string
  serviceId: string
  managementCompanyId: string
}

export function ServiceDetailPageClient({
  condominiumId,
  serviceId,
  managementCompanyId,
}: ServiceDetailPageClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const d = 'admin.condominiums.detail.services.detail'

  const executionModal = useDisclosure()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: serviceData, isLoading: serviceLoading } = useCondominiumServiceDetail({
    companyId: managementCompanyId,
    serviceId,
    condominiumId,
    enabled: !!managementCompanyId && !!serviceId,
  })

  const { data: executionsData, isLoading: executionsLoading } = useServiceExecutionsPaginated({
    companyId: managementCompanyId,
    serviceId,
    condominiumId,
    query: { page: 1, limit: 50 },
    enabled: !!managementCompanyId && !!serviceId,
  })

  const { data: currenciesData } = useActiveCurrencies()
  const currencies = useMemo(() => currenciesData?.data ?? [], [currenciesData])

  const service = serviceData?.data
  const executions = (executionsData?.data ?? []) as TServiceExecution[]

  const getCurrencySymbol = useCallback(
    (cId: string) => {
      const cur = currencies.find(c => c.id === cId)

      return cur?.symbol || cur?.code || ''
    },
    [currencies]
  )

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const deactivateMutation = useDeactivateCondominiumService(managementCompanyId, condominiumId)

  const deleteMutation = useDeleteServiceExecution(managementCompanyId, serviceId, condominiumId, {
    onSuccess: () => {
      toast.success(t(`${d}.executionDeleted`))
      queryClient.invalidateQueries({
        queryKey: serviceExecutionKeys.all,
      })
      setConfirmDeleteId(null)
    },
    onError: () => toast.error(t(`${d}.executionDeleteError`)),
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    executionModal.onOpen()
  }, [executionModal])

  const handleExecutionSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: serviceExecutionKeys.all,
    })
    executionModal.onClose()
  }, [queryClient, executionModal])

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (serviceLoading || !service) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const providerTypeColor =
    PROVIDER_TYPE_COLORS[service.providerType as keyof typeof PROVIDER_TYPE_COLORS] || 'default'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="text-primary shrink-0" size={14} />

    return <FileText className="text-danger shrink-0" size={14} />
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Wrench className="text-primary shrink-0" size={22} />
          <Typography variant="h3">{service.name}</Typography>
          <Chip color={providerTypeColor} size="sm" variant="flat">
            {t(`admin.condominiums.detail.services.providerTypes.${service.providerType}`)}
          </Chip>
          <Chip color={service.isActive ? 'success' : 'default'} size="sm" variant="dot">
            {service.isActive ? t('common.status.active') : t('common.status.inactive')}
          </Chip>
        </div>

        {service.description && (
          <Typography color="muted" variant="body2">
            {service.description}
          </Typography>
        )}

        {service.isActive && (
          <div className="flex justify-end">
            <Button
              color="danger"
              isDisabled={confirmDeactivate}
              size="sm"
              startContent={<Ban size={14} />}
              variant="bordered"
              onPress={() => setConfirmDeactivate(true)}
            >
              {t(`${d}.deactivate`)}
            </Button>
          </div>
        )}
      </div>

      {/* ── Deactivate confirmation ─────────────────────────────────────────── */}
      {confirmDeactivate && (
        <div className="rounded-lg bg-danger-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-danger" size={18} />
            <Typography className="font-semibold text-danger" variant="body2">
              {t(`${d}.confirmDeactivateService`)}
            </Typography>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={() => setConfirmDeactivate(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              color="danger"
              isLoading={deactivateMutation.isPending}
              size="sm"
              onPress={() =>
                deactivateMutation.mutate(
                  { serviceId },
                  {
                    onSuccess: () => {
                      toast.success(t(`${d}.deactivated`))
                      queryClient.invalidateQueries({ queryKey: condominiumServiceKeys.all })
                      setConfirmDeactivate(false)
                    },
                    onError: () => toast.error(t(`${d}.deactivateError`)),
                  }
                )
              }
            >
              {t(`${d}.deactivate`)}
            </Button>
          </div>
        </div>
      )}

      {/* ── Provider Info ────────────────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold flex items-center gap-2" variant="body2">
            <Building2 size={16} />
            {t(`${d}.provider`)}
          </Typography>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {service.legalName && (
              <div className="flex items-start gap-2">
                <User className="text-default-400 mt-0.5 shrink-0" size={14} />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.legalName`)}</p>
                  <p className="text-sm">{service.legalName}</p>
                </div>
              </div>
            )}
            {(service.taxIdType || service.taxIdNumber) && (
              <div className="flex items-start gap-2">
                <Hash className="text-default-400 mt-0.5 shrink-0" size={14} />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.taxId`)}</p>
                  <p className="text-sm">
                    {service.taxIdType && `${service.taxIdType}-`}
                    {service.taxIdNumber}
                  </p>
                </div>
              </div>
            )}
            {service.email && (
              <div className="flex items-start gap-2">
                <Mail className="text-default-400 mt-0.5 shrink-0" size={14} />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.email`)}</p>
                  <p className="text-sm">{service.email}</p>
                </div>
              </div>
            )}
            {service.phone && (
              <div className="flex items-start gap-2">
                <Phone className="text-default-400 mt-0.5 shrink-0" size={14} />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.phone`)}</p>
                  <p className="text-sm">
                    {service.phoneCountryCode}
                    {service.phone}
                  </p>
                </div>
              </div>
            )}
            {service.address && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="text-default-400 mt-0.5 shrink-0" size={14} />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.address`)}</p>
                  <p className="text-sm">{service.address}</p>
                </div>
              </div>
            )}
            {!service.legalName &&
              !service.taxIdNumber &&
              !service.email &&
              !service.phone &&
              !service.address && (
                <p className="text-sm text-default-400 col-span-2">{t(`${d}.notSpecified`)}</p>
              )}
          </div>
        </CardBody>
      </Card>

      {/* ── Fiscal Config ────────────────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold flex items-center gap-2" variant="body2">
            <DollarSign size={16} />
            {t(`${d}.fiscalConfig`)}
          </Typography>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {service.chargesIva && (
              <div>
                <p className="text-xs text-default-400">{t(`${d}.ivaRate`)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Percent className="text-default-500" size={12} />
                  <p className="text-sm">{((service.ivaRate ?? 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}
            {service.subjectToIslarRetention && (
              <div>
                <p className="text-xs text-default-400">{t(`${d}.islrRetentionRate`)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Percent className="text-default-500" size={12} />
                  <p className="text-sm">{((service.islrRetentionRate ?? 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}
            {!service.chargesIva && !service.subjectToIslarRetention && (
              <p className="text-sm text-default-400">{t(`${d}.notSpecified`)}</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Executions ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Typography className="flex items-center gap-2" variant="h4">
            {t(`${d}.executions`)}
            {executions.length > 0 && (
              <Chip color="default" size="sm" variant="flat">
                {executions.length}
              </Chip>
            )}
          </Typography>
          <Button
            color="primary"
            size="sm"
            startContent={<Plus size={16} />}
            onPress={handleOpenCreate}
          >
            {t(`${d}.newExecution`)}
          </Button>
        </div>

        {executionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
            <FileText className="mb-3 text-default-300" size={36} />
            <Typography color="muted" variant="body2">
              {t(`${d}.noExecutions`)}
            </Typography>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map(execution => (
              <ExecutionCard
                key={execution.id}
                confirmDeleteId={confirmDeleteId}
                currencies={currencies}
                d={d}
                execution={execution}
                formatDate={formatDate}
                getCurrencySymbol={getCurrencySymbol}
                getFileTypeIcon={getFileTypeIcon}
                isDeleting={deleteMutation.isPending && confirmDeleteId === execution.id}
                setConfirmDeleteId={setConfirmDeleteId}
                t={t}
                onDelete={id => deleteMutation.mutate({ executionId: id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Execution Modal ──────────────────────────────────────────────────── */}
      <ExecutionModal
        condominiumId={condominiumId}
        execution={null}
        isOpen={executionModal.isOpen}
        managementCompanyId={managementCompanyId}
        serviceId={serviceId}
        onClose={executionModal.onClose}
        onSuccess={handleExecutionSuccess}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExecutionCard sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface IExecutionCardProps {
  execution: TServiceExecution
  d: string
  t: (key: string) => string
  formatDate: (dateStr: string) => string
  getFileTypeIcon: (mimeType: string) => React.ReactNode
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void
  onDelete: (id: string) => void
  isDeleting: boolean
  getCurrencySymbol: (currencyId: string) => string
  currencies: TCurrency[]
}

function ExecutionCard({
  execution,
  d,
  t,
  formatDate,
  getFileTypeIcon,
  confirmDeleteId,
  setConfirmDeleteId,
  onDelete,
  isDeleting,
  getCurrencySymbol,
  currencies,
}: IExecutionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const rateModal = useDisclosure()
  const currencySymbol = getCurrencySymbol(execution.currencyId)

  return (
    <Card className="w-full">
      <CardBody className="space-y-3">
        {/* Row header */}
        <div className="flex items-start gap-3">
          <div
            className="flex-1 min-w-0 space-y-1 cursor-pointer"
            onClick={() => setExpanded(prev => !prev)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{execution.title}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-default-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(execution.executionDate)}
              </span>
              {execution.invoiceNumber && (
                <span className="flex items-center gap-1">
                  <Hash size={12} />
                  {execution.invoiceNumber}
                </span>
              )}
              {execution.attachments && execution.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileText size={12} />
                  {execution.attachments.length} {t(`${d}.attachmentsAbbrev`)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-sm font-mono font-semibold">
              {currencySymbol}{' '}
              {Number(execution.totalAmount).toLocaleString('es-VE', {
                minimumFractionDigits: 2,
              })}
            </p>
            <Button
              isIconOnly
              size="sm"
              title={t(`${d}.viewExchangeRates`)}
              variant="light"
              onPress={rateModal.onOpen}
            >
              <ArrowLeftRight size={14} />
            </Button>
            <Button
              isIconOnly
              color="danger"
              size="sm"
              variant="light"
              onPress={() => setConfirmDeleteId(execution.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Delete confirmation inline */}
        {confirmDeleteId === execution.id && (
          <div className="rounded-lg bg-danger-50 p-3 space-y-2">
            <p className="text-sm text-danger font-medium flex items-center gap-1">
              <AlertTriangle size={14} />
              {t(`${d}.confirmDeleteExecution`)}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="flat" onPress={() => setConfirmDeleteId(null)}>
                {t(`${d}.cancel`)}
              </Button>
              <Button
                color="danger"
                isLoading={isDeleting}
                size="sm"
                onPress={() => onDelete(execution.id)}
              >
                {t(`${d}.deleteExecution`)}
              </Button>
            </div>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 border-t border-default-200 pt-3">
            {execution.description && (
              <div>
                <p className="text-xs text-default-400 mb-1">{t(`${d}.description`)}</p>
                <p className="text-sm">{execution.description}</p>
              </div>
            )}

            {/* Items */}
            {execution.items && execution.items.length > 0 && (
              <div>
                <p className="text-xs text-default-400 mb-2">{t(`${d}.items`)}</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-default-200 text-xs text-default-500">
                        <th className="pb-1 text-left font-medium">{t(`${d}.itemDescription`)}</th>
                        <th className="pb-1 text-right font-medium w-16">
                          {t(`${d}.itemQuantity`)}
                        </th>
                        <th className="pb-1 text-right font-medium w-24">
                          {t(`${d}.itemUnitPrice`)}
                        </th>
                        <th className="pb-1 text-right font-medium w-24">{t(`${d}.itemAmount`)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {execution.items.map(item => (
                        <tr key={item.id} className="border-b border-default-100">
                          <td className="py-1.5 pr-2">
                            <p>{item.description}</p>
                            {item.notes && <p className="text-xs text-default-400">{item.notes}</p>}
                          </td>
                          <td className="py-1.5 text-right">{item.quantity}</td>
                          <td className="py-1.5 text-right font-mono">
                            {currencySymbol}{' '}
                            {Number(item.unitPrice).toLocaleString('es-VE', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-1.5 text-right font-mono">
                            {currencySymbol}{' '}
                            {Number(item.amount).toLocaleString('es-VE', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attachments */}
            {execution.attachments && execution.attachments.length > 0 && (
              <div>
                <p className="text-xs text-default-400 mb-2">{t(`${d}.attachments`)}</p>
                <div className="space-y-1.5">
                  {execution.attachments.map(attachment => (
                    <a
                      key={attachment.url}
                      className="flex items-center gap-2 rounded-lg border border-default-200 p-2 hover:bg-default-50 transition-colors"
                      href={attachment.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {getFileTypeIcon(attachment.mimeType)}
                      <span className="text-sm flex-1 truncate">{attachment.name}</span>
                      <ExternalLink className="text-default-400 shrink-0" size={12} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {execution.notes && (
              <div>
                <p className="text-xs text-default-400 mb-1">{t(`${d}.notes`)}</p>
                <p className="text-sm whitespace-pre-wrap">{execution.notes}</p>
              </div>
            )}
          </div>
        )}

        <ExchangeRateModal
          currencies={currencies}
          currencyId={execution.currencyId}
          executionDate={execution.executionDate}
          isOpen={rateModal.isOpen}
          totalAmount={execution.totalAmount}
          onClose={rateModal.onClose}
        />
      </CardBody>
    </Card>
  )
}
