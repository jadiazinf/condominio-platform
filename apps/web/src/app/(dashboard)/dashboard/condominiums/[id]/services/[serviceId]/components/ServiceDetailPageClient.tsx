'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@packages/http-client/hooks'
import {
  Wrench,
  Plus,
  Pencil,
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
} from 'lucide-react'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { useDisclosure } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import type { TServiceExecution } from '@packages/domain'
import {
  useCondominiumServiceDetail,
  useDeactivateCondominiumService,
  useServiceExecutionsPaginated,
  useDeleteServiceExecution,
  serviceExecutionKeys,
  condominiumServiceKeys,
} from '@packages/http-client/hooks'
import { ExecutionModal } from '../../components/ExecutionModal'

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
  const [selectedExecution, setSelectedExecution] = useState<TServiceExecution | null>(null)
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

  const service = serviceData?.data
  const executions = (executionsData?.data ?? []) as TServiceExecution[]

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const deactivateMutation = useDeactivateCondominiumService(managementCompanyId, condominiumId)

  const deleteMutation = useDeleteServiceExecution(
    managementCompanyId,
    serviceId,
    condominiumId,
    {
      onSuccess: () => {
        toast.success(t(`${d}.executionDeleted`))
        queryClient.invalidateQueries({
          queryKey: serviceExecutionKeys.all,
        })
        setConfirmDeleteId(null)
      },
      onError: () => toast.error(t(`${d}.executionDeleteError`)),
    }
  )

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setSelectedExecution(null)
    executionModal.onOpen()
  }, [executionModal])

  const handleOpenEdit = useCallback(
    (execution: TServiceExecution) => {
      setSelectedExecution(execution)
      executionModal.onOpen()
    },
    [executionModal]
  )

  const handleExecutionSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: serviceExecutionKeys.all,
    })
    executionModal.onClose()
    setSelectedExecution(null)
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
    if (mimeType.startsWith('image/')) return <Image size={14} className="text-primary shrink-0" />
    return <FileText size={14} className="text-danger shrink-0" />
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Wrench className="text-primary shrink-0" size={22} />
          <Typography variant="h3">{service.name}</Typography>
          <Chip
            color={providerTypeColor}
            variant="flat"
            size="sm"
          >
            {t(`admin.condominiums.detail.services.providerTypes.${service.providerType}`)}
          </Chip>
          <Chip
            color={service.isActive ? 'success' : 'default'}
            variant="dot"
            size="sm"
          >
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
              size="sm"
              color="danger"
              variant="bordered"
              startContent={<Ban size={14} />}
              onPress={() => setConfirmDeactivate(true)}
              isDisabled={confirmDeactivate}
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
            <Typography variant="body2" className="font-semibold text-danger">
              {t(`${d}.confirmDeactivateService`)}
            </Typography>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={() => setConfirmDeactivate(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              color="danger"
              isLoading={deactivateMutation.isPending}
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
          <Typography variant="body2" className="font-semibold flex items-center gap-2">
            <Building2 size={16} />
            {t(`${d}.provider`)}
          </Typography>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {service.legalName && (
              <div className="flex items-start gap-2">
                <User size={14} className="text-default-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.legalName`)}</p>
                  <p className="text-sm">{service.legalName}</p>
                </div>
              </div>
            )}
            {(service.taxIdType || service.taxIdNumber) && (
              <div className="flex items-start gap-2">
                <Hash size={14} className="text-default-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.taxId`)}</p>
                  <p className="text-sm">
                    {service.taxIdType && `${service.taxIdType}-`}{service.taxIdNumber}
                  </p>
                </div>
              </div>
            )}
            {service.email && (
              <div className="flex items-start gap-2">
                <Mail size={14} className="text-default-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.email`)}</p>
                  <p className="text-sm">{service.email}</p>
                </div>
              </div>
            )}
            {service.phone && (
              <div className="flex items-start gap-2">
                <Phone size={14} className="text-default-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-default-400">{t(`${d}.phone`)}</p>
                  <p className="text-sm">
                    {service.phoneCountryCode}{service.phone}
                  </p>
                </div>
              </div>
            )}
            {service.address && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin size={14} className="text-default-400 mt-0.5 shrink-0" />
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
                <p className="text-sm text-default-400 col-span-2">
                  {t(`${d}.notSpecified`)}
                </p>
              )}
          </div>
        </CardBody>
      </Card>

      {/* ── Fiscal Config ────────────────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-3">
          <Typography variant="body2" className="font-semibold flex items-center gap-2">
            <DollarSign size={16} />
            {t(`${d}.fiscalConfig`)}
          </Typography>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {service.defaultAmount != null && (
              <div>
                <p className="text-xs text-default-400">{t(`${d}.defaultAmount`)}</p>
                <p className="text-sm font-mono font-medium">
                  {Number(service.defaultAmount).toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            {service.chargesIva && (
              <div>
                <p className="text-xs text-default-400">{t(`${d}.ivaRate`)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Percent size={12} className="text-default-500" />
                  <p className="text-sm">{((service.ivaRate ?? 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}
            {service.subjectToIslarRetention && (
              <div>
                <p className="text-xs text-default-400">{t(`${d}.islrRetentionRate`)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Percent size={12} className="text-default-500" />
                  <p className="text-sm">{((service.islrRetentionRate ?? 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}
            {!service.chargesIva && !service.subjectToIslarRetention && !service.defaultAmount && (
              <p className="text-sm text-default-400">{t(`${d}.notSpecified`)}</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Executions ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Typography variant="h4" className="flex items-center gap-2">
            {t(`${d}.executions`)}
            {executions.length > 0 && (
              <Chip size="sm" variant="flat" color="default">
                {executions.length}
              </Chip>
            )}
          </Typography>
          <Button
            size="sm"
            color="primary"
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
                execution={execution}
                d={d}
                t={t}
                formatDate={formatDate}
                getFileTypeIcon={getFileTypeIcon}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                onEdit={handleOpenEdit}
                onDelete={id => deleteMutation.mutate({ executionId: id })}
                isDeleting={deleteMutation.isPending && confirmDeleteId === execution.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Execution Modal ──────────────────────────────────────────────────── */}
      <ExecutionModal
        isOpen={executionModal.isOpen}
        onClose={executionModal.onClose}
        managementCompanyId={managementCompanyId}
        serviceId={serviceId}
        condominiumId={condominiumId}
        currencyId={service.currencyId}
        execution={selectedExecution}
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
  onEdit: (execution: TServiceExecution) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function ExecutionCard({
  execution,
  d,
  t,
  formatDate,
  getFileTypeIcon,
  confirmDeleteId,
  setConfirmDeleteId,
  onEdit,
  onDelete,
  isDeleting,
}: IExecutionCardProps) {
  const [expanded, setExpanded] = useState(false)

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
              <Chip
                size="sm"
                variant="flat"
                color={execution.status === 'confirmed' ? 'success' : 'warning'}
              >
                {t(`${d}.${execution.status}`)}
              </Chip>
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
              {Number(execution.totalAmount).toLocaleString('es-VE', {
                minimumFractionDigits: 2,
              })}
            </p>
            {execution.status !== 'confirmed' && (
              <>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => onEdit(execution)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => setConfirmDeleteId(execution.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
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
              <Button
                size="sm"
                variant="flat"
                onPress={() => setConfirmDeleteId(null)}
              >
                {t(`${d}.cancel`)}
              </Button>
              <Button
                size="sm"
                color="danger"
                isLoading={isDeleting}
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
                        <th className="pb-1 text-right font-medium w-16">{t(`${d}.itemQuantity`)}</th>
                        <th className="pb-1 text-right font-medium w-24">{t(`${d}.itemUnitPrice`)}</th>
                        <th className="pb-1 text-right font-medium w-24">{t(`${d}.itemAmount`)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {execution.items.map(item => (
                        <tr key={item.id} className="border-b border-default-100">
                          <td className="py-1.5 pr-2">
                            <p>{item.description}</p>
                            {item.notes && (
                              <p className="text-xs text-default-400">{item.notes}</p>
                            )}
                          </td>
                          <td className="py-1.5 text-right">{item.quantity}</td>
                          <td className="py-1.5 text-right font-mono">
                            {Number(item.unitPrice).toLocaleString('es-VE', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-1.5 text-right font-mono">
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
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-default-200 p-2 hover:bg-default-50 transition-colors"
                    >
                      {getFileTypeIcon(attachment.mimeType)}
                      <span className="text-sm flex-1 truncate">{attachment.name}</span>
                      <ExternalLink size={12} className="text-default-400 shrink-0" />
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
      </CardBody>
    </Card>
  )
}
