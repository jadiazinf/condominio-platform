import type { TUnit, TUnitOwnership, TQuota, TPayment } from '@packages/domain'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Link } from '@/ui/components/link'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Divider } from '@/ui/components/divider'
import { ArrowLeft, Home } from 'lucide-react'

import { getUnitDetail } from '@packages/http-client/hooks'
import { getUnitOwnerships } from '@packages/http-client/hooks'
import { getQuotasByUnitServer } from '@packages/http-client/hooks'
import { getPaymentsByUnitServer } from '@packages/http-client/hooks'

import { formatAmount } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

import { ViewAllQuotasButton, ViewAllPaymentsButton, AddOwnershipButton, OwnersTable } from './components/UnitDetailClient'

interface PageProps {
  params: Promise<{ id: string; buildingId: string; unitId: string }>
}

export default async function UnitDetailPage({ params }: PageProps) {
  const { id: condominiumId, buildingId, unitId } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId
    : undefined

  const ud = 'superadmin.condominiums.detail.unitDetail'

  // Fetch all data in parallel
  let unit: TUnit | null = null
  let ownerships: TUnitOwnership[] = []
  let quotas: TQuota[] = []
  let payments: TPayment[] = []

  try {
    const results = await Promise.allSettled([
      getUnitDetail(token, unitId, condominiumId, managementCompanyId),
      getUnitOwnerships(token, unitId, condominiumId, managementCompanyId),
      getQuotasByUnitServer(token, unitId, condominiumId, managementCompanyId),
      getPaymentsByUnitServer(token, unitId, condominiumId, managementCompanyId),
    ])

    if (results[0].status === 'fulfilled') unit = results[0].value
    if (results[1].status === 'fulfilled') ownerships = results[1].value
    if (results[2].status === 'fulfilled') quotas = results[2].value
    if (results[3].status === 'fulfilled') payments = results[3].value
  } catch (error) {
    console.error('Failed to fetch unit data:', error)
  }

  const backHref = `/dashboard/condominiums/${condominiumId}/buildings/${buildingId}`

  if (!unit) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
        >
          <ArrowLeft size={14} />
          {t(`${ud}.back`)}
        </Link>
        <Typography variant="h3">Unit not found</Typography>
      </div>
    )
  }

  // Financial calculations
  const pendingQuotas = quotas.filter(q => q.status === 'pending' || q.status === 'overdue')
  const totalDebt = pendingQuotas.reduce((sum, q) => sum + parseFloat(q.balance || '0'), 0)
  const sortedPayments = [...payments].sort((a, b) =>
    new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  )
  const lastPayment = sortedPayments[0]
  const recentQuotas = [...quotas]
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 5)
  const recentPayments = sortedPayments.slice(0, 5)

  // Formatters
  const aliquotFormatted = unit.aliquotPercentage
    ? parseFloat(unit.aliquotPercentage).toFixed(2)
    : null

  // Specs line
  const specs: string[] = []
  if (unit.floor != null) specs.push(`${t(`${ud}.floor`)} ${unit.floor}`)
  if (unit.areaM2) specs.push(`${unit.areaM2} m²`)
  if (unit.bedrooms != null) specs.push(`${unit.bedrooms} ${t(`${ud}.bedrooms`).toLowerCase()}`)
  if (unit.bathrooms != null) specs.push(`${unit.bathrooms} ${t(`${ud}.bathrooms`).toLowerCase()}`)
  if (unit.parkingSpaces != null && unit.parkingSpaces > 0) specs.push(`${unit.parkingSpaces} ${t(`${ud}.parking`).toLowerCase()}`)
  if (aliquotFormatted) specs.push(`${t(`${ud}.aliquot`)} ${aliquotFormatted}%`)

  // Labels
  const ownershipTypeLabels: Record<string, string> = {
    owner: t(`${ud}.ownershipTypes.owner`),
    'co-owner': t(`${ud}.ownershipTypes.co-owner`),
    tenant: t(`${ud}.ownershipTypes.tenant`),
    family_member: t(`${ud}.ownershipTypes.family_member`),
    authorized: t(`${ud}.ownershipTypes.authorized`),
  }

  const quotaStatusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    paid: 'success',
    pending: 'warning',
    overdue: 'danger',
    cancelled: 'default',
  }

  const paymentStatusColors: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'primary'> = {
    completed: 'success',
    pending: 'warning',
    pending_verification: 'primary',
    failed: 'danger',
    refunded: 'default',
    rejected: 'danger',
  }

  const quotaStatusLabels: Record<string, string> = {
    pending: t(`${ud}.quotaStatuses.pending`),
    paid: t(`${ud}.quotaStatuses.paid`),
    overdue: t(`${ud}.quotaStatuses.overdue`),
    cancelled: t(`${ud}.quotaStatuses.cancelled`),
  }

  const paymentStatusLabels: Record<string, string> = {
    pending: t(`${ud}.paymentStatuses.pending`),
    pending_verification: t(`${ud}.paymentStatuses.pending_verification`),
    completed: t(`${ud}.paymentStatuses.completed`),
    failed: t(`${ud}.paymentStatuses.failed`),
    refunded: t(`${ud}.paymentStatuses.refunded`),
    rejected: t(`${ud}.paymentStatuses.rejected`),
  }

  const paymentMethodLabels: Record<string, string> = {
    transfer: t(`${ud}.paymentMethods.transfer`),
    cash: t(`${ud}.paymentMethods.cash`),
    card: t(`${ud}.paymentMethods.card`),
    mobile_payment: t(`${ud}.paymentMethods.mobile_payment`),
    gateway: t(`${ud}.paymentMethods.gateway`),
    other: t(`${ud}.paymentMethods.other`),
  }

  // Table columns
  type TQuotaRow = TQuota & { id: string }
  type TPaymentRow = TPayment & { id: string }

  const quotaColumns: ITableColumn<TQuotaRow>[] = [
    { key: 'concept', label: t(`${ud}.quotaTable.concept`) },
    { key: 'period', label: t(`${ud}.quotaTable.period`) },
    { key: 'amount', label: t(`${ud}.quotaTable.amount`), align: 'end' },
    { key: 'paid', label: t(`${ud}.quotaTable.paid`), align: 'end' },
    { key: 'balance', label: t(`${ud}.quotaTable.balance`), align: 'end' },
    { key: 'status', label: t(`${ud}.quotaTable.status`) },
  ]

  const paymentColumns: ITableColumn<TPaymentRow>[] = [
    { key: 'number', label: t(`${ud}.paymentTable.number`) },
    { key: 'date', label: t(`${ud}.paymentTable.date`) },
    { key: 'amount', label: t(`${ud}.paymentTable.amount`), align: 'end' },
    { key: 'method', label: t(`${ud}.paymentTable.method`) },
    { key: 'status', label: t(`${ud}.paymentTable.status`) },
  ]

  const renderQuotaCell = (quota: TQuota, columnKey: string) => {
    switch (columnKey) {
      case 'concept':
        return quota.paymentConcept?.name || quota.periodDescription || '-'
      case 'period': {
        if (quota.periodMonth) {
          const monthName = new Date(quota.periodYear, quota.periodMonth - 1).toLocaleDateString('es-VE', { month: 'short' })
          return `${monthName} ${quota.periodYear}`
        }
        return quota.periodDescription || `${quota.periodYear}`
      }
      case 'amount':
        return formatAmount(quota.baseAmount)
      case 'paid':
        return formatAmount(quota.paidAmount)
      case 'balance':
        return (
          <span className={parseFloat(quota.balance) > 0 ? 'text-danger font-medium' : ''}>
            {formatAmount(quota.balance)}
          </span>
        )
      case 'status':
        return (
          <Chip color={quotaStatusColors[quota.status] || 'default'} variant="flat" size="sm">
            {quotaStatusLabels[quota.status] || quota.status}
          </Chip>
        )
      default:
        return null
    }
  }

  const renderPaymentCell = (payment: TPayment, columnKey: string) => {
    switch (columnKey) {
      case 'number':
        return payment.paymentNumber || '-'
      case 'date':
        return formatFullDate(payment.paymentDate)
      case 'amount':
        return formatAmount(payment.amount)
      case 'method':
        return paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod
      case 'status':
        return (
          <Chip color={paymentStatusColors[payment.status] || 'default'} variant="flat" size="sm">
            {paymentStatusLabels[payment.status] || payment.status}
          </Chip>
        )
      default:
        return null
    }
  }

  // Shared filter translations for modals
  const filterTranslations = {
    dateFrom: t(`${ud}.filters.dateFrom`),
    dateTo: t(`${ud}.filters.dateTo`),
    status: t(`${ud}.filters.status`),
    allStatuses: t(`${ud}.filters.allStatuses`),
    clear: t(`${ud}.filters.clear`),
  }

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
      >
        <ArrowLeft size={14} />
        {t(`${ud}.back`)}
      </Link>

      {/* Unified header card */}
      <Card>
        <CardBody className="gap-0 py-4">
          {/* Row 1: Unit name + status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Home className="text-primary" size={18} />
              </div>
              <Typography variant="h3">{unit.unitNumber}</Typography>
            </div>
            <Chip color={unit.isActive ? 'success' : 'default'} variant="flat" size="sm">
              {unit.isActive ? t('common.status.active') : t('common.status.inactive')}
            </Chip>
          </div>

          {/* Row 2: Specs inline */}
          {specs.length > 0 && (
            <Typography variant="body2" color="muted" className="mt-1.5 ml-12">
              {specs.join(' · ')}
            </Typography>
          )}

          {/* Row 3: Registration date */}
          <Typography variant="body2" color="muted" className="mt-0.5 ml-12 text-xs">
            {t(`${ud}.registered`)} {formatFullDate(unit.createdAt)}
          </Typography>

          {/* Financial summary */}
          <Divider className="my-3" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <Typography variant="body2" color="muted" className="text-xs">{t(`${ud}.totalDebt`)}</Typography>
              <Typography variant="h4" className={`mt-0.5 ${totalDebt > 0 ? 'text-danger' : 'text-success'}`}>
                ${formatAmount(totalDebt)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="body2" color="muted" className="text-xs">{t(`${ud}.pendingQuotas`)}</Typography>
              <Typography variant="h4" className="mt-0.5">
                {pendingQuotas.length}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="body2" color="muted" className="text-xs">{t(`${ud}.lastPayment`)}</Typography>
              <Typography variant="h4" className="mt-0.5 text-base">
                {lastPayment ? formatFullDate(lastPayment.paymentDate) : t(`${ud}.noPayments`)}
              </Typography>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recent Quotas — 5 items max + View All */}
      <Card>
        <CardBody className="py-3">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="body1" className="font-semibold text-sm">{t(`${ud}.recentQuotas`)}</Typography>
            <ViewAllQuotasButton
              unitId={unitId}
              label={t(`${ud}.viewAll`)}
              translations={{
                title: t(`${ud}.allQuotasTitle`),
                filters: filterTranslations,
                table: {
                  concept: t(`${ud}.quotaTable.concept`),
                  period: t(`${ud}.quotaTable.period`),
                  amount: t(`${ud}.quotaTable.amount`),
                  paid: t(`${ud}.quotaTable.paid`),
                  balance: t(`${ud}.quotaTable.balance`),
                  status: t(`${ud}.quotaTable.status`),
                },
                statuses: quotaStatusLabels,
                noResults: t(`${ud}.noQuotas`),
              }}
            />
          </div>
          {recentQuotas.length === 0 ? (
            <Typography variant="body2" color="muted" className="text-xs">{t(`${ud}.noQuotas`)}</Typography>
          ) : (
            <Table<TQuotaRow>
              aria-label={t(`${ud}.recentQuotas`)}
              columns={quotaColumns}
              rows={recentQuotas}
              renderCell={renderQuotaCell}
              classNames={{
                wrapper: 'shadow-none border-none p-0',
                tr: 'hover:bg-default-50',
                th: 'text-xs',
                td: 'text-sm py-1.5',
              }}
            />
          )}
        </CardBody>
      </Card>

      {/* Recent Payments — 5 items max + View All */}
      <Card>
        <CardBody className="py-3">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="body1" className="font-semibold text-sm">{t(`${ud}.recentPayments`)}</Typography>
            <ViewAllPaymentsButton
              unitId={unitId}
              label={t(`${ud}.viewAll`)}
              translations={{
                title: t(`${ud}.allPaymentsTitle`),
                filters: filterTranslations,
                table: {
                  number: t(`${ud}.paymentTable.number`),
                  date: t(`${ud}.paymentTable.date`),
                  amount: t(`${ud}.paymentTable.amount`),
                  method: t(`${ud}.paymentTable.method`),
                  status: t(`${ud}.paymentTable.status`),
                },
                statuses: paymentStatusLabels,
                methods: paymentMethodLabels,
                noResults: t(`${ud}.noPaymentsRegistered`),
              }}
            />
          </div>
          {recentPayments.length === 0 ? (
            <Typography variant="body2" color="muted" className="text-xs">{t(`${ud}.noPaymentsRegistered`)}</Typography>
          ) : (
            <Table<TPaymentRow>
              aria-label={t(`${ud}.recentPayments`)}
              columns={paymentColumns}
              rows={recentPayments}
              renderCell={renderPaymentCell}
              classNames={{
                wrapper: 'shadow-none border-none p-0',
                tr: 'hover:bg-default-50',
                th: 'text-xs',
                td: 'text-sm py-1.5',
              }}
            />
          )}
        </CardBody>
      </Card>

      {/* Owners / Residents — table + add button */}
      <Card>
        <CardBody className="py-3">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="body1" className="font-semibold text-sm">{t(`${ud}.owners`)}</Typography>
            <AddOwnershipButton
              unitId={unitId}
              label={t(`${ud}.addOwner`)}
              translations={{
                title: t(`${ud}.addOwnerTitle`),
                cancel: t('common.cancel'),
                save: t('common.save'),
                saving: t('common.saving'),
                tabs: {
                  search: t(`${ud}.ownerTabs.search`),
                  register: t(`${ud}.ownerTabs.register`),
                },
                search: {
                  placeholder: t(`${ud}.ownerSearch.placeholder`),
                  button: t(`${ud}.ownerSearch.button`),
                  searching: t(`${ud}.ownerSearch.searching`),
                  notFound: t(`${ud}.ownerSearch.notFound`),
                  notFoundHint: t(`${ud}.ownerSearch.notFoundHint`),
                  userFound: t(`${ud}.ownerSearch.userFound`),
                },
                form: {
                  fullName: t(`${ud}.ownerForm.fullName`),
                  email: t(`${ud}.ownerForm.email`),
                  phone: t(`${ud}.ownerForm.phone`),
                  phoneCode: t(`${ud}.ownerForm.phoneCode`),
                  ownershipType: t(`${ud}.ownerForm.ownershipType`),
                  idDocumentType: t(`${ud}.ownerForm.idDocumentType`),
                  idDocumentNumber: t(`${ud}.ownerForm.idDocumentNumber`),
                },
                ownershipTypes: ownershipTypeLabels,
                documentTypes: {
                  CI: 'CI',
                  RIF: 'RIF',
                  Pasaporte: 'Pasaporte',
                },
                success: { created: t(`${ud}.ownerSuccess.created`) },
                error: { create: t(`${ud}.ownerError.create`) },
                validation: {
                  'validation.required': t(`${ud}.ownerValidation.required`),
                  'validation.email': t(`${ud}.ownerValidation.email`),
                },
              }}
            />
          </div>
          <OwnersTable
            ownerships={ownerships}
            translations={{
              columns: {
                name: t(`${ud}.ownerTable.name`),
                type: t(`${ud}.ownerTable.type`),
                startDate: t(`${ud}.ownerTable.startDate`),
                status: t(`${ud}.ownerTable.status`),
                verified: t(`${ud}.ownerTable.verified`),
              },
              ownershipTypes: ownershipTypeLabels,
              yes: t(`${ud}.yes`),
              no: t(`${ud}.no`),
              active: t('common.status.active'),
              inactive: t('common.status.inactive'),
              noOwners: t(`${ud}.noOwners`),
              ariaLabel: t(`${ud}.owners`),
              resendInvitation: t(`${ud}.ownerResend.tooltip`),
              resendSuccess: t(`${ud}.ownerResend.success`),
              resendError: t(`${ud}.ownerResend.error`),
              detail: {
                title: t(`${ud}.ownerDetail.title`),
                fullName: t(`${ud}.ownerDetail.fullName`),
                email: t(`${ud}.ownerDetail.email`),
                phone: t(`${ud}.ownerDetail.phone`),
                document: t(`${ud}.ownerDetail.document`),
                ownershipType: t(`${ud}.ownerDetail.ownershipType`),
                startDate: t(`${ud}.ownerDetail.startDate`),
                status: t(`${ud}.ownerDetail.status`),
                primaryResidence: t(`${ud}.ownerDetail.primaryResidence`),
                close: t('common.close'),
                noData: t(`${ud}.ownerDetail.noData`),
              },
            }}
          />
        </CardBody>
      </Card>
    </div>
  )
}
