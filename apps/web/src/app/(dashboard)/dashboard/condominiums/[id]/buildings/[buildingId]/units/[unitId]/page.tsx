import type { TUnit, TUnitOwnership, TQuota, TPayment } from '@packages/domain'

import { ArrowLeft, Home } from 'lucide-react'
import { getUnitDetail } from '@packages/http-client/hooks'
import { getUnitOwnerships } from '@packages/http-client/hooks'
import { getQuotasByUnitServer } from '@packages/http-client/hooks'
import { getPaymentsByUnitServer } from '@packages/http-client/hooks'
import { formatAmount } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

import {
  ViewAllQuotasButton,
  ViewAllPaymentsButton,
  AddOwnershipButton,
  OwnersTable,
  RecentQuotasTable,
  RecentPaymentsTable,
} from './components/UnitDetailClient'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Link } from '@/ui/components/link'
import { Divider } from '@/ui/components/divider'

interface PageProps {
  params: Promise<{ id: string; buildingId: string; unitId: string }>
}

export default async function UnitDetailPage({ params }: PageProps) {
  const { id: condominiumId, buildingId, unitId } = await params
  const [{ t }, token, session] = await Promise.all([
    getTranslations(),
    getServerAuthToken(),
    getFullSession(),
  ])

  const managementCompanyId =
    session?.activeRole === 'management_company'
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
          className="inline-flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
          href={backHref}
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
  const currencySymbol = quotas[0]?.currency?.symbol || quotas[0]?.currency?.code || '$'
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
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
  if (unit.parkingSpaces != null && unit.parkingSpaces > 0)
    specs.push(`${unit.parkingSpaces} ${t(`${ud}.parking`).toLowerCase()}`)
  if (aliquotFormatted) specs.push(`${t(`${ud}.aliquot`)} ${aliquotFormatted}%`)

  // Labels
  const ownershipTypeLabels: Record<string, string> = {
    owner: t(`${ud}.ownershipTypes.owner`),
    'co-owner': t(`${ud}.ownershipTypes.co-owner`),
    tenant: t(`${ud}.ownershipTypes.tenant`),
    family_member: t(`${ud}.ownershipTypes.family_member`),
    authorized: t(`${ud}.ownershipTypes.authorized`),
  }

  const quotaStatusLabels: Record<string, string> = {
    pending: t(`${ud}.quotaStatuses.pending`),
    partial: t(`${ud}.quotaStatuses.partial`),
    paid: t(`${ud}.quotaStatuses.paid`),
    overdue: t(`${ud}.quotaStatuses.overdue`),
    cancelled: t(`${ud}.quotaStatuses.cancelled`),
    exonerated: t(`${ud}.quotaStatuses.exonerated`),
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
        className="inline-flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
        href={backHref}
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
            <Chip color={unit.isActive ? 'success' : 'default'} size="sm" variant="flat">
              {unit.isActive ? t('common.status.active') : t('common.status.inactive')}
            </Chip>
          </div>

          {/* Row 2: Specs inline */}
          {specs.length > 0 && (
            <Typography className="mt-1.5 ml-12" color="muted" variant="body2">
              {specs.join(' · ')}
            </Typography>
          )}

          {/* Row 3: Registration date */}
          <Typography className="mt-0.5 ml-12 text-xs" color="muted" variant="body2">
            {t(`${ud}.registered`)} {formatFullDate(unit.createdAt)}
          </Typography>

          {/* Financial summary */}
          <Divider className="my-3" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <Typography className="text-xs" color="muted" variant="body2">
                {t(`${ud}.totalDebt`)}
              </Typography>
              <Typography
                className={`mt-0.5 ${totalDebt > 0 ? 'text-danger' : 'text-success'}`}
                variant="h4"
              >
                {currencySymbol} {formatAmount(totalDebt)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography className="text-xs" color="muted" variant="body2">
                {t(`${ud}.pendingQuotas`)}
              </Typography>
              <Typography className="mt-0.5" variant="h4">
                {pendingQuotas.length}
              </Typography>
            </div>
            <div className="text-center">
              <Typography className="text-xs" color="muted" variant="body2">
                {t(`${ud}.lastPayment`)}
              </Typography>
              <Typography className="mt-0.5 text-base" variant="h4">
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
            <Typography className="font-semibold text-sm" variant="body1">
              {t(`${ud}.recentQuotas`)}
            </Typography>
            <ViewAllQuotasButton
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
                actions: {
                  cancel: t('admin.quotas.actions.cancel'),
                  cancelTitle: t('admin.quotas.actions.cancelTitle'),
                  cancelWarning: t('admin.quotas.actions.cancelWarning'),
                  cancelReasonLabel: t('admin.quotas.actions.cancelReasonLabel'),
                  cancelReasonPlaceholder: t('admin.quotas.actions.cancelReasonPlaceholder'),
                  cancelReasonMinLength: t('admin.quotas.actions.cancelReasonMinLength'),
                  confirmCancel: t('admin.quotas.actions.confirmCancel'),
                  cancelSuccess: t('admin.quotas.actions.cancelSuccess'),
                  cancelError: t('admin.quotas.actions.cancelError'),
                  close: t('common.cancel'),
                  generate: t('admin.quotas.actions.generate'),
                  generateTitle: t('admin.quotas.actions.generateTitle'),
                  generateDescription: t('admin.quotas.actions.generateDescription'),
                  generateConcept: t('admin.quotas.actions.generateConcept'),
                  generateConceptPlaceholder: t('admin.quotas.actions.generateConceptPlaceholder'),
                  generateYear: t('admin.quotas.actions.generateYear'),
                  generateMonth: t('admin.quotas.actions.generateMonth'),
                  generateMonthPlaceholder: t('admin.quotas.actions.generateMonthPlaceholder'),
                  confirmGenerate: t('admin.quotas.actions.confirmGenerate'),
                  generateSuccess: t('admin.quotas.actions.generateSuccess'),
                  generateError: t('admin.quotas.actions.generateError'),
                  noConceptsAvailable: t('admin.quotas.actions.noConceptsAvailable'),
                  generateModeAll: t('admin.quotas.actions.generateModeAll'),
                  generateModeSingle: t('admin.quotas.actions.generateModeSingle'),
                  generateAllDescription: t('admin.quotas.actions.generateAllDescription'),
                  generateAllSuccess: t('admin.quotas.actions.generateAllSuccess'),
                  generateResultCreated: t('admin.quotas.actions.generateResultCreated'),
                  generateResultSkipped: t('admin.quotas.actions.generateResultSkipped'),
                  generateResultFailed: t('admin.quotas.actions.generateResultFailed'),
                  conceptPreview: {
                    title: t('admin.quotas.actions.conceptPreview.title'),
                    close: t('admin.quotas.actions.conceptPreview.close'),
                    description: t('admin.quotas.actions.conceptPreview.description'),
                    conceptType: t('admin.quotas.actions.conceptPreview.conceptType'),
                    currency: t('admin.quotas.actions.conceptPreview.currency'),
                    recurrence: t('admin.quotas.actions.conceptPreview.recurrence'),
                    generationStrategy: t('admin.quotas.actions.conceptPreview.generationStrategy'),
                    allowsPartialPayment: t(
                      'admin.quotas.actions.conceptPreview.allowsPartialPayment'
                    ),
                    scheduleTitle: t('admin.quotas.actions.conceptPreview.scheduleTitle'),
                    issueDay: t('admin.quotas.actions.conceptPreview.issueDay'),
                    dueDay: t('admin.quotas.actions.conceptPreview.dueDay'),
                    effectiveFrom: t('admin.quotas.actions.conceptPreview.effectiveFrom'),
                    effectiveUntil: t('admin.quotas.actions.conceptPreview.effectiveUntil'),
                    latePaymentTitle: t('admin.quotas.actions.conceptPreview.latePaymentTitle'),
                    latePaymentType: t('admin.quotas.actions.conceptPreview.latePaymentType'),
                    latePaymentValue: t('admin.quotas.actions.conceptPreview.latePaymentValue'),
                    latePaymentGraceDays: t(
                      'admin.quotas.actions.conceptPreview.latePaymentGraceDays'
                    ),
                    earlyPaymentTitle: t('admin.quotas.actions.conceptPreview.earlyPaymentTitle'),
                    earlyPaymentType: t('admin.quotas.actions.conceptPreview.earlyPaymentType'),
                    earlyPaymentValue: t('admin.quotas.actions.conceptPreview.earlyPaymentValue'),
                    earlyPaymentDaysBeforeDue: t(
                      'admin.quotas.actions.conceptPreview.earlyPaymentDaysBeforeDue'
                    ),
                    amountTitle: t('admin.quotas.actions.conceptPreview.amountTitle'),
                    totalAmount: t('admin.quotas.actions.conceptPreview.totalAmount'),
                    unitAmount: t('admin.quotas.actions.conceptPreview.unitAmount'),
                    assignmentScope: t('admin.quotas.actions.conceptPreview.assignmentScope'),
                    distributionMethod: t('admin.quotas.actions.conceptPreview.distributionMethod'),
                    noAssignment: t('admin.quotas.actions.conceptPreview.noAssignment'),
                    yes: t('admin.quotas.actions.conceptPreview.yes'),
                    no: t('admin.quotas.actions.conceptPreview.no'),
                    notConfigured: t('admin.quotas.actions.conceptPreview.notConfigured'),
                    conceptTypes: {
                      maintenance: t(
                        'admin.quotas.actions.conceptPreview.conceptTypes.maintenance'
                      ),
                      condominium_fee: t(
                        'admin.quotas.actions.conceptPreview.conceptTypes.condominium_fee'
                      ),
                      extraordinary: t(
                        'admin.quotas.actions.conceptPreview.conceptTypes.extraordinary'
                      ),
                      fine: t('admin.quotas.actions.conceptPreview.conceptTypes.fine'),
                      reserve_fund: t(
                        'admin.quotas.actions.conceptPreview.conceptTypes.reserve_fund'
                      ),
                      other: t('admin.quotas.actions.conceptPreview.conceptTypes.other'),
                    },
                    recurrencePeriods: {
                      monthly: t('admin.quotas.actions.conceptPreview.recurrencePeriods.monthly'),
                      quarterly: t(
                        'admin.quotas.actions.conceptPreview.recurrencePeriods.quarterly'
                      ),
                      yearly: t('admin.quotas.actions.conceptPreview.recurrencePeriods.yearly'),
                    },
                    strategies: {
                      auto: t('admin.quotas.actions.conceptPreview.strategies.auto'),
                      bulk: t('admin.quotas.actions.conceptPreview.strategies.bulk'),
                      manual: t('admin.quotas.actions.conceptPreview.strategies.manual'),
                    },
                    scopes: {
                      condominium: t('admin.quotas.actions.conceptPreview.scopes.condominium'),
                      building: t('admin.quotas.actions.conceptPreview.scopes.building'),
                      unit: t('admin.quotas.actions.conceptPreview.scopes.unit'),
                    },
                    distributions: {
                      by_aliquot: t('admin.quotas.actions.conceptPreview.distributions.by_aliquot'),
                      equal_split: t(
                        'admin.quotas.actions.conceptPreview.distributions.equal_split'
                      ),
                      fixed_per_unit: t(
                        'admin.quotas.actions.conceptPreview.distributions.fixed_per_unit'
                      ),
                    },
                    adjustmentTypes: {
                      percentage: t(
                        'admin.quotas.actions.conceptPreview.adjustmentTypes.percentage'
                      ),
                      fixed: t('admin.quotas.actions.conceptPreview.adjustmentTypes.fixed'),
                      none: t('admin.quotas.actions.conceptPreview.adjustmentTypes.none'),
                    },
                  },
                },
              }}
              unitId={unitId}
            />
          </div>
          {recentQuotas.length === 0 ? (
            <Typography className="text-xs" color="muted" variant="body2">
              {t(`${ud}.noQuotas`)}
            </Typography>
          ) : (
            <RecentQuotasTable
              quotas={recentQuotas}
              translations={{
                ariaLabel: t(`${ud}.recentQuotas`),
                columns: {
                  concept: t(`${ud}.quotaTable.concept`),
                  period: t(`${ud}.quotaTable.period`),
                  amount: t(`${ud}.quotaTable.amount`),
                  paid: t(`${ud}.quotaTable.paid`),
                  balance: t(`${ud}.quotaTable.balance`),
                  status: t(`${ud}.quotaTable.status`),
                },
                statuses: quotaStatusLabels,
              }}
            />
          )}
        </CardBody>
      </Card>

      {/* Recent Payments — 5 items max + View All */}
      <Card>
        <CardBody className="py-3">
          <div className="flex items-center justify-between mb-2">
            <Typography className="font-semibold text-sm" variant="body1">
              {t(`${ud}.recentPayments`)}
            </Typography>
            <ViewAllPaymentsButton
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
              unitId={unitId}
            />
          </div>
          {recentPayments.length === 0 ? (
            <Typography className="text-xs" color="muted" variant="body2">
              {t(`${ud}.noPaymentsRegistered`)}
            </Typography>
          ) : (
            <RecentPaymentsTable
              payments={recentPayments}
              translations={{
                ariaLabel: t(`${ud}.recentPayments`),
                columns: {
                  number: t(`${ud}.paymentTable.number`),
                  date: t(`${ud}.paymentTable.date`),
                  amount: t(`${ud}.paymentTable.amount`),
                  method: t(`${ud}.paymentTable.method`),
                  status: t(`${ud}.paymentTable.status`),
                },
                statuses: paymentStatusLabels,
                methods: paymentMethodLabels,
              }}
            />
          )}
        </CardBody>
      </Card>

      {/* Owners / Residents — table + add button */}
      <Card>
        <CardBody className="py-3">
          <div className="flex items-center justify-between mb-2">
            <Typography className="font-semibold text-sm" variant="body1">
              {t(`${ud}.owners`)}
            </Typography>
            <AddOwnershipButton
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
                  J: 'J - Jurídico',
                  G: 'G - Gobierno',
                  V: 'V - Venezolano',
                  E: 'E - Extranjero',
                  P: 'P - Pasaporte',
                },
                success: { created: t(`${ud}.ownerSuccess.created`) },
                error: { create: t(`${ud}.ownerError.create`) },
                validation: {
                  'validation.required': t(`${ud}.ownerValidation.required`),
                  'validation.email': t(`${ud}.ownerValidation.email`),
                },
              }}
              unitId={unitId}
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
