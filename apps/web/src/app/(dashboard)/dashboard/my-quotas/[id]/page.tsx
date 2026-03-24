'use client'

import type { TQuotaStatus } from '@packages/domain'

import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  History,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { formatAmount } from '@packages/utils/currency'
import { useQuotaDetail, usePaymentApplicationsByQuota } from '@packages/http-client'

import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Skeleton } from '@/ui/components/skeleton'
import { Spinner } from '@/ui/components/spinner'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { useTranslation } from '@/contexts'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtAmount(amount: string | null | undefined): string {
  if (!amount) return '-'

  return formatAmount(amount)
}

const QUOTA_STATUS_CHIP_COLOR: Record<
  TQuotaStatus,
  'warning' | 'danger' | 'success' | 'default' | 'secondary' | 'primary'
> = {
  pending: 'warning',
  partial: 'primary',
  overdue: 'danger',
  paid: 'success',
  cancelled: 'default',
  exonerated: 'secondary',
}

const QUOTA_STATUS_ICON: Record<TQuotaStatus, typeof Clock> = {
  pending: Clock,
  partial: Clock,
  overdue: AlertCircle,
  paid: CheckCircle2,
  cancelled: XCircle,
  exonerated: CheckCircle2,
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MyQuotaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [showServices, setShowServices] = useState(false)

  const { data, isLoading, error } = useQuotaDetail(id)
  const quota = data?.data

  const { data: applicationsData, isLoading: appsLoading } = usePaymentApplicationsByQuota(id, {
    enabled: !!quota,
  })
  const applications = applicationsData?.data ?? []

  const p = 'resident.myQuotas.detail'

  // Amount breakdown
  const amountBreakdown = useMemo(() => {
    if (!quota) return null
    const base = parseFloat(quota.baseAmount) || 0
    const interest = parseFloat(quota.interestAmount) || 0
    const paid = parseFloat(quota.paidAmount) || 0
    const balance = parseFloat(quota.balance) || 0

    return { base, interest, total: base + interest, paid, balance }
  }, [quota])

  // Format period using i18n months
  const formattedPeriod = useMemo(() => {
    if (!quota) return '-'
    if (quota.periodMonth != null) {
      const monthName = t(`${p}.months.${quota.periodMonth}`)

      return `${monthName} ${quota.periodYear}`
    }

    return String(quota.periodYear)
  }, [quota, t, p])

  // Format dates
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '-'
    const d =
      typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00' : '')) : date

    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) return <QuotaDetailSkeleton />

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !quota) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t(`${p}.error`)}
        </Typography>
        <Button
          className="mt-4"
          color="primary"
          onPress={() => router.push('/dashboard/my-quotas')}
        >
          {t(`${p}.backToQuotas`)}
        </Button>
      </div>
    )
  }

  const currencySymbol = (quota.currency as any)?.symbol ?? '$'
  const currencyCode = (quota.currency as any)?.code ?? ''
  const currencyName = (quota.currency as any)?.name ?? ''
  const status = quota.status as TQuotaStatus
  const StatusIcon = QUOTA_STATUS_ICON[status] ?? Clock
  const chipColor = QUOTA_STATUS_CHIP_COLOR[status] ?? 'default'
  const isPending = status === 'pending' || status === 'overdue'

  // Concept info from enriched response
  const concept = quota.paymentConcept as any
  const conceptName = concept?.name ?? '-'
  const conceptType = concept?.conceptType
  const conceptDescription = concept?.description
  const conceptIsRecurring = concept?.isRecurring
  const conceptRecurrencePeriod = concept?.recurrencePeriod
  const conceptLatePaymentType = concept?.latePaymentType
  const conceptLatePaymentValue = concept?.latePaymentValue
  const conceptEarlyPaymentType = concept?.earlyPaymentType
  const conceptEarlyPaymentValue = concept?.earlyPaymentValue
  const conceptEarlyPaymentDaysBeforeDue = concept?.earlyPaymentDaysBeforeDue

  // Unit info from enriched response
  const unit = quota.unit as any
  const unitNumber = unit?.unitNumber
  const unitFloor = unit?.floor
  const buildingName = unit?.building?.name

  // Services linked to the concept
  const services = ((quota as any).services ?? []) as Array<{
    id: string
    serviceName: string
    providerType: string
    amount: number
    useDefaultAmount: boolean
  }>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => router.push('/dashboard/my-quotas')}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Typography className="flex-1" variant="h3">
              {conceptName}
            </Typography>
            <Chip
              className="self-end sm:self-auto shrink-0"
              color={chipColor}
              size="lg"
              startContent={<StatusIcon size={14} />}
              variant="flat"
            >
              {t(`${p}.status.${status}`)}
            </Chip>
          </div>
          <Typography className="mt-0.5" color="muted" variant="body2">
            {formattedPeriod}
          </Typography>
        </div>
      </div>

      {/* Amount breakdown */}
      {amountBreakdown && (
        <div className="rounded-xl border border-default-200 bg-default-50/50 p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <span className="text-xs text-default-400 block mb-1">{t(`${p}.baseAmount`)}</span>
              <span className="text-lg font-semibold">
                <ConvertedAmount
                  amount={quota.baseAmount}
                  amountInBaseCurrency={quota.amountInBaseCurrency}
                  currencyCode={currencyCode}
                  currencySymbol={currencySymbol}
                  exchangeRateUsed={quota.exchangeRateUsed}
                  isBaseCurrency={(quota.currency as any)?.isBaseCurrency}
                />
              </span>
            </div>
            <AmountCell
              highlight={amountBreakdown.interest > 0 ? 'danger' : undefined}
              label={t(`${p}.interest`)}
              value={`${currencySymbol} ${fmtAmount(quota.interestAmount)}`}
            />
            <AmountCell
              label={t(`${p}.total`)}
              value={`${currencySymbol} ${fmtAmount(String(amountBreakdown.total))}`}
            />
            <AmountCell
              highlight={amountBreakdown.paid > 0 ? 'success' : undefined}
              label={t(`${p}.paid`)}
              value={`${currencySymbol} ${fmtAmount(quota.paidAmount)}`}
            />
            <AmountCell
              highlight={amountBreakdown.balance > 0 ? 'warning' : undefined}
              label={t(`${p}.balance`)}
              value={`${currencySymbol} ${fmtAmount(quota.balance)}`}
            />
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Concept info */}
        <InfoCard icon={<FileText size={16} />} title={t(`${p}.conceptInfo`)}>
          <InfoRow label={t(`${p}.concept`)} value={conceptName} />
          {conceptType && (
            <InfoRow
              label={t(`${p}.conceptType`)}
              value={t(`${p}.conceptTypes.${conceptType}`) || conceptType}
            />
          )}
          {conceptDescription && (
            <InfoRow label={t(`${p}.conceptDescription`)} value={conceptDescription} />
          )}
          <InfoRow
            label={t(`${p}.recurrence`)}
            value={
              conceptIsRecurring
                ? `${t(`${p}.recurring`)}${conceptRecurrencePeriod ? ` (${t(`${p}.recurrencePeriods.${conceptRecurrencePeriod}`) || conceptRecurrencePeriod})` : ''}`
                : t(`${p}.oneTime`)
            }
          />
          <InfoRow label={t(`${p}.period`)} value={formattedPeriod} />
          {currencyCode && <InfoRow label={t(`${p}.currency`)} value={currencyCode} />}
          {conceptLatePaymentType && conceptLatePaymentType !== 'none' && (
            <InfoRow
              label={t(`${p}.latePayment`)}
              value={
                conceptLatePaymentType === 'percentage'
                  ? `${conceptLatePaymentValue}%`
                  : `${currencySymbol} ${conceptLatePaymentValue}`
              }
            />
          )}
          {conceptEarlyPaymentType && conceptEarlyPaymentType !== 'none' && (
            <InfoRow
              label={t(`${p}.earlyPayment`)}
              value={
                `${conceptEarlyPaymentType === 'percentage' ? `${conceptEarlyPaymentValue}%` : `${currencySymbol} ${conceptEarlyPaymentValue}`}` +
                (conceptEarlyPaymentDaysBeforeDue
                  ? ` (${conceptEarlyPaymentDaysBeforeDue} ${t(`${p}.daysBeforeDue`)})`
                  : '')
              }
            />
          )}
        </InfoCard>

        {/* Dates & unit */}
        <InfoCard icon={<Calendar size={16} />} title={t(`${p}.datesAndUnit`)}>
          {unitNumber && <InfoRow label={t(`${p}.unit`)} value={unitNumber} />}
          {buildingName && <InfoRow label={t(`${p}.building`)} value={buildingName} />}
          {unitFloor && <InfoRow label={t(`${p}.floor`)} value={unitFloor} />}
          <InfoRow label={t(`${p}.issueDate`)} value={formatDate(quota.issueDate)} />
          <InfoRow label={t(`${p}.dueDate`)} value={formatDate(quota.dueDate)} />
        </InfoCard>
      </div>

      {/* Notes */}
      {quota.notes && (
        <InfoCard icon={<FileText size={16} />} title={t(`${p}.notes`)}>
          <p className="text-sm text-default-600 leading-relaxed">{quota.notes}</p>
        </InfoCard>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          className="w-full"
          color="default"
          size="lg"
          startContent={<Wrench size={16} />}
          variant="bordered"
          onPress={() => setShowServices(true)}
        >
          {t(`${p}.viewServices`)}
          {services.length > 0 && (
            <Chip className="ml-1" color="secondary" size="sm" variant="flat">
              {services.length}
            </Chip>
          )}
        </Button>
        <Button
          className="w-full"
          color="default"
          size="lg"
          startContent={<History size={16} />}
          variant="bordered"
          onPress={() => setShowPaymentHistory(true)}
        >
          {t(`${p}.viewPaymentHistory`)}
          {applications.length > 0 && (
            <Chip className="ml-1" color="primary" size="sm" variant="flat">
              {applications.length}
            </Chip>
          )}
        </Button>
        {isPending && (
          <Button
            as={Link}
            className="w-full sm:col-span-2"
            color="primary"
            href={`/dashboard/pay?quotaIds=${id}&unitId=${quota.unitId}`}
            size="lg"
          >
            {t(`${p}.pay`)}
          </Button>
        )}
      </div>

      {/* Services Modal */}
      <Modal isOpen={showServices} size="lg" onClose={() => setShowServices(false)}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Wrench size={18} />
            {t(`${p}.servicesTitle`)}
          </ModalHeader>
          <ModalBody className="pb-6">
            {services.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <Typography color="muted" variant="body2">
                  {t(`${p}.noServices`)}
                </Typography>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map(svc => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between rounded-lg border border-default-200 p-4"
                  >
                    <div>
                      <span className="text-base font-semibold">{svc.serviceName}</span>
                      {svc.providerType && (
                        <p className="text-xs text-default-400 mt-1">
                          {t(`${p}.providerTypes.${svc.providerType}`) || svc.providerType}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-semibold">
                      {currencySymbol} {fmtAmount(String(svc.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Payment History Modal */}
      <Modal isOpen={showPaymentHistory} size="lg" onClose={() => setShowPaymentHistory(false)}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <History size={18} />
            {t(`${p}.paymentHistory`)}
          </ModalHeader>
          <ModalBody className="pb-6">
            {appsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <Typography color="muted" variant="body2">
                  {t(`${p}.noPayments`)}
                </Typography>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <Link
                    key={app.id}
                    className="block rounded-lg border border-default-200 p-4 transition-colors hover:bg-default-50"
                    href={`/dashboard/my-payments/${app.paymentId}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-semibold">
                          {currencySymbol} {fmtAmount(app.appliedAmount)} {currencyCode}
                        </span>
                        <p className="text-xs text-default-400 mt-1">{formatDate(app.appliedAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-default-500">
                        {parseFloat(app.appliedToPrincipal ?? '0') > 0 && (
                          <span>
                            {t(`${p}.principal`)}: {currencySymbol}{' '}
                            {fmtAmount(app.appliedToPrincipal)}
                          </span>
                        )}
                        {parseFloat(app.appliedToInterest ?? '0') > 0 && (
                          <span>
                            {t(`${p}.interestPaid`)}: {currencySymbol}{' '}
                            {fmtAmount(app.appliedToInterest)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AmountCell({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'danger' | 'success' | 'warning'
}) {
  const textColor = highlight
    ? highlight === 'danger'
      ? 'text-danger-500'
      : highlight === 'success'
        ? 'text-success-500'
        : 'text-warning-500'
    : 'text-foreground'

  return (
    <div>
      <span className="text-xs text-default-400 block mb-1">{label}</span>
      <span className={`text-lg font-semibold ${textColor}`}>{value}</span>
    </div>
  )
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-default-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-default-400">{icon}</span>}
        <Typography variant="h4">{title}</Typography>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
      <span className="text-sm text-default-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function QuotaDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded" />
        <div className="flex-1">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="mt-1.5 h-4 w-32 rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-5 sm:grid-cols-2">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl border border-default-200 p-4">
            <Skeleton className="mb-3 h-5 w-36 rounded" />
            <div className="space-y-2.5">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
