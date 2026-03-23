'use client'

import type { TPaymentConceptAssignment } from '@packages/domain'
import type { TApiDataResponse } from '@packages/http-client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  Layers,
  Landmark,
  Ban,
  AlertTriangle,
  Users,
  Wrench,
  Pencil,
  History,
} from 'lucide-react'
import {
  usePaymentConceptDetail,
  useDeactivatePaymentConcept,
  useDeactivateAssignment,
  useApiQuery,
  useCondominiumBuildingsList,
  paymentConceptKeys,
  paymentConceptAssignmentKeys,
  useQueryClient,
} from '@packages/http-client'

import { AffectedUnitsModal } from './AffectedUnitsModal'
import { RelatedServicesModal } from './RelatedServicesModal'
import { DelinquencyModal } from './DelinquencyModal'
import { CreatePaymentConceptWizard } from './wizard/CreatePaymentConceptWizard'

import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

interface PaymentConceptDetailPageClientProps {
  condominiumId: string
  conceptId: string
  managementCompanyId: string
}

const TYPE_COLORS = {
  maintenance: 'primary',
  condominium_fee: 'secondary',
  extraordinary: 'warning',
  fine: 'danger',
  reserve_fund: 'success',
  other: 'default',
} as const

export function PaymentConceptDetailPageClient({
  condominiumId,
  conceptId,
  managementCompanyId,
}: PaymentConceptDetailPageClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'
  const backUrl = `/dashboard/condominiums/${condominiumId}/payment-concepts`

  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [affectedUnitsOpen, setAffectedUnitsOpen] = useState(false)
  const [editWizardOpen, setEditWizardOpen] = useState(false)

  const { data, isLoading } = usePaymentConceptDetail({
    companyId: managementCompanyId,
    conceptId,
    enabled: !!conceptId && !!managementCompanyId,
  })

  const concept = data?.data

  const [servicesOpen, setServicesOpen] = useState(false)
  const [delinquencyOpen, setDelinquencyOpen] = useState(false)

  // Data for the edit wizard
  const { data: currenciesData } = useApiQuery<
    TApiDataResponse<Array<{ id: string; code: string; name?: string }>>
  >({
    path: `/${managementCompanyId}/me/currencies`,
    queryKey: ['currencies', 'mc', managementCompanyId],
    enabled: editWizardOpen && !!managementCompanyId,
  })
  const { data: buildingsData } = useCondominiumBuildingsList({
    condominiumId,
    managementCompanyId,
    enabled: editWizardOpen,
  })

  const currencies = useMemo(() => {
    const list = currenciesData?.data ?? []

    return list.map((c: any) => ({ id: c.id, code: c.code, name: c.name }))
  }, [currenciesData])

  const buildings = useMemo(() => {
    const list = buildingsData?.data ?? []

    return list.map((b: any) => ({ id: b.id, name: b.name }))
  }, [buildingsData])

  const changeHistoryUrl = `/dashboard/condominiums/${condominiumId}/payment-concepts/${conceptId}/change-history`

  const deactivateConcept = useDeactivatePaymentConcept(managementCompanyId, {
    onSuccess: response => {
      const result = response.data?.data

      toast.success(
        t(`${d}.deactivated`, {
          cancelledQuotas: result?.cancelledQuotas ?? 0,
          deactivatedAssignments: result?.deactivatedAssignments ?? 0,
        })
      )
      queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      setConfirmDeactivate(false)
      router.push(backUrl)
    },
    onError: () => toast.error(t(`${d}.deactivateError`)),
  })

  const [deactivatingAssignmentId, setDeactivatingAssignmentId] = useState<string | null>(null)
  const [cancelAssignmentQuotas, setCancelAssignmentQuotas] = useState(false)

  const deactivateAssignment = useDeactivateAssignment(managementCompanyId, conceptId, {
    onSuccess: () => {
      toast.success(t(`${d}.assignmentDeactivated`))
      queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentConceptAssignmentKeys.all })
      setDeactivatingAssignmentId(null)
      setCancelAssignmentQuotas(false)
    },
    onError: () => toast.error(t(`${d}.assignmentDeactivateError`)),
  })

  const typeLabels = useMemo(
    () => ({
      maintenance: t('admin.paymentConcepts.types.maintenance'),
      condominium_fee: t('admin.paymentConcepts.types.condominiumFee'),
      extraordinary: t('admin.paymentConcepts.types.extraordinary'),
      fine: t('admin.paymentConcepts.types.fine'),
      reserve_fund: t('admin.paymentConcepts.types.reserveFund'),
      other: t('admin.paymentConcepts.types.other'),
    }),
    [t]
  )

  const recurrenceLabels = useMemo(
    () => ({
      monthly: t('admin.paymentConcepts.recurrence.monthly'),
      quarterly: t('admin.paymentConcepts.recurrence.quarterly'),
      yearly: t('admin.paymentConcepts.recurrence.yearly'),
    }),
    [t]
  )

  const scopeLabels = useMemo(
    () => ({
      condominium: t(`${d}.scopeCondominium`),
      building: t(`${d}.scopeBuilding`),
      unit: t(`${d}.scopeUnit`),
    }),
    [t]
  )

  const methodLabels = useMemo(
    () => ({
      by_aliquot: t(`${d}.methodAliquot`),
      equal_split: t(`${d}.methodEqualSplit`),
      fixed_per_unit: t(`${d}.methodFixed`),
    }),
    [t]
  )

  const formatAdjustment = (type: string, value: number | null) => {
    if (type === 'none' || !value) return t(`${d}.none`)
    if (type === 'percentage') return `${value}%`

    return `${value}`
  }

  const conceptAny = concept as any
  const currencyDisplay = conceptAny?.currency
    ? `${conceptAny.currency.symbol ?? ''} ${conceptAny.currency.code}`.trim()
    : (concept?.currencyId ?? '-')

  if (isLoading || !concept) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <FileText className="text-success" size={22} />
          <Typography variant="h3">{concept.name}</Typography>
          <Chip color={concept.isActive ? 'success' : 'default'} size="sm" variant="flat">
            {concept.isActive ? t('common.status.active') : t('common.status.inactive')}
          </Chip>
        </div>
        {concept.description && (
          <Typography color="muted" variant="body2">
            {concept.description}
          </Typography>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            startContent={<Wrench size={14} />}
            variant="flat"
            onPress={() => setServicesOpen(true)}
          >
            {t(`${d}.relatedServices`)}
          </Button>
          <Button
            size="sm"
            startContent={<Users size={14} />}
            variant="flat"
            onPress={() => setAffectedUnitsOpen(true)}
          >
            {t(`${d}.affectedUnits`)}
          </Button>
          <Button
            color="warning"
            size="sm"
            startContent={<AlertTriangle size={14} />}
            variant="flat"
            onPress={() => setDelinquencyOpen(true)}
          >
            {t(`${d}.delinquency`)}
          </Button>
          <Button
            size="sm"
            startContent={<History size={14} />}
            variant="flat"
            onPress={() => router.push(changeHistoryUrl)}
          >
            {t(`${d}.changeHistory`)}
          </Button>
          {concept.isActive && (
            <>
              <Button
                color="primary"
                size="sm"
                startContent={<Pencil size={14} />}
                variant="flat"
                onPress={() => setEditWizardOpen(true)}
              >
                {t(`${d}.edit`)}
              </Button>
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
            </>
          )}
        </div>
      </div>

      {/* Deactivate Confirmation */}
      {confirmDeactivate && (
        <div className="rounded-lg bg-danger-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-danger" size={18} />
            <Typography className="font-semibold text-danger" variant="body2">
              {t(`${d}.deactivateConfirm`)}
            </Typography>
          </div>
          <p className="text-sm text-danger-700">{t(`${d}.deactivateWarning`)}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={() => setConfirmDeactivate(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              color="danger"
              isLoading={deactivateConcept.isPending}
              size="sm"
              onPress={() => deactivateConcept.mutate({ conceptId })}
            >
              {t(`${d}.confirmDeactivate`)}
            </Button>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold flex items-center gap-2" variant="body2">
            <Layers size={16} />
            {t(`${d}.basicInfo`)}
          </Typography>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-default-500">{t(`${d}.type`)}</span>
              <div className="mt-1">
                <Chip
                  color={TYPE_COLORS[concept.conceptType as keyof typeof TYPE_COLORS] || 'default'}
                  size="sm"
                  variant="flat"
                >
                  {typeLabels[concept.conceptType as keyof typeof typeLabels] ||
                    concept.conceptType}
                </Chip>
              </div>
            </div>
            <div>
              <span className="text-xs text-default-500">{t(`${d}.currency`)}</span>
              <p className="text-sm font-medium mt-1">{currencyDisplay}</p>
            </div>
            <div>
              <span className="text-xs text-default-500">{t(`${d}.effectiveFrom`)}</span>
              <p className="text-sm mt-1 flex items-center gap-1">
                <CalendarDays className="text-default-400" size={14} />
                {concept.effectiveFrom
                  ? new Date(concept.effectiveFrom).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-default-500">{t(`${d}.effectiveUntil`)}</span>
              <p className="text-sm mt-1 flex items-center gap-1">
                <CalendarDays className="text-default-400" size={14} />
                {concept.effectiveUntil
                  ? new Date(concept.effectiveUntil).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-default-500">{t(`${d}.recurring`)}</span>
              <p className="text-sm mt-1">
                {concept.isRecurring ? t('common.yes') : t('common.no')}
                {concept.isRecurring && concept.recurrencePeriod && (
                  <span className="text-default-500">
                    {' '}
                    ({recurrenceLabels[concept.recurrencePeriod as keyof typeof recurrenceLabels]})
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-default-500">{t(`${d}.partialPayment`)}</span>
              <p className="text-sm mt-1">
                {concept.allowsPartialPayment ? t('common.yes') : t('common.no')}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Charge Config Section */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold flex items-center gap-2" variant="body2">
            <Clock size={16} />
            {t(`${d}.chargeConfig`)}
          </Typography>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-default-500">{t(`${d}.createdAt`)}</span>
              <p className="text-sm mt-1">
                {new Date(concept.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {concept.isRecurring && (
              <>
                <div />
                <div>
                  <span className="text-xs text-default-500">{t(`${d}.issueDay`)}</span>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <CalendarDays className="text-default-400" size={14} />
                    {concept.issueDay ? `${concept.issueDay} de cada mes` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-default-500">{t(`${d}.dueDay`)}</span>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <CalendarDays className="text-default-400" size={14} />
                    {concept.dueDay
                      ? concept.issueDay && concept.dueDay < concept.issueDay
                        ? `${concept.dueDay} del mes siguiente`
                        : `${concept.dueDay} del mes`
                      : '-'}
                  </p>
                </div>
              </>
            )}

            {concept.latePaymentType !== 'none' && (
              <div className="col-span-2">
                <span className="text-xs text-default-500">{t(`${d}.lateFee`)}</span>
                <p className="text-sm mt-1">
                  {formatAdjustment(concept.latePaymentType, concept.latePaymentValue)}
                  {concept.latePaymentGraceDays > 0 && (
                    <span className="text-default-500">
                      {' '}
                      ({concept.latePaymentGraceDays} {t(`${d}.graceDays`)})
                    </span>
                  )}
                </p>
              </div>
            )}

            {concept.earlyPaymentType !== 'none' && (
              <div className="col-span-2">
                <span className="text-xs text-default-500">{t(`${d}.earlyDiscount`)}</span>
                <p className="text-sm mt-1">
                  {formatAdjustment(concept.earlyPaymentType, concept.earlyPaymentValue)}
                  {concept.earlyPaymentDaysBeforeDue > 0 && (
                    <span className="text-default-500">
                      {' '}
                      ({concept.earlyPaymentDaysBeforeDue} {t(`${d}.daysBefore`)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Assignments Section */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold flex items-center gap-2" variant="body2">
            {t(`${d}.assignments`)} ({concept.assignments?.length ?? 0})
          </Typography>

          {concept.assignments && concept.assignments.length > 0 ? (
            <div className="space-y-2">
              {concept.assignments.map((assignment: TPaymentConceptAssignment) => (
                <div
                  key={assignment.id}
                  className="rounded-lg border border-default-200 p-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <Chip color="primary" size="sm" variant="flat">
                      {scopeLabels[assignment.scopeType as keyof typeof scopeLabels]}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      {methodLabels[assignment.distributionMethod as keyof typeof methodLabels]}
                    </Chip>
                    {!assignment.isActive && (
                      <Chip color="default" size="sm" variant="flat">
                        {t('common.status.inactive')}
                      </Chip>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {conceptAny?.currency?.symbol ?? ''} {assignment.amount.toLocaleString()}{' '}
                    {conceptAny?.currency?.code ?? ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-default-400">
                      {t(`${d}.assignedOn`)}{' '}
                      {new Date(assignment.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {assignment.isActive && concept.isActive && (
                      <Button
                        color="danger"
                        size="sm"
                        variant="light"
                        onPress={() => setDeactivatingAssignmentId(assignment.id)}
                      >
                        <Ban size={12} />
                        {t(`${d}.deactivateAssignment`)}
                      </Button>
                    )}
                  </div>
                  {deactivatingAssignmentId === assignment.id && (
                    <div className="mt-2 rounded-lg bg-danger-50 p-3 space-y-2">
                      <p className="text-sm text-danger-700">
                        {t(`${d}.deactivateAssignmentWarning`)}
                      </p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          checked={cancelAssignmentQuotas}
                          type="checkbox"
                          onChange={e => setCancelAssignmentQuotas(e.target.checked)}
                        />
                        {t(`${d}.cancelPendingQuotas`)}
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            setDeactivatingAssignmentId(null)
                            setCancelAssignmentQuotas(false)
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          color="danger"
                          isLoading={deactivateAssignment.isPending}
                          size="sm"
                          onPress={() =>
                            deactivateAssignment.mutate({
                              assignmentId: assignment.id,
                              cancelPendingQuotas: cancelAssignmentQuotas,
                            })
                          }
                        >
                          {t(`${d}.confirmDeactivateAssignment`)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-default-400">{t(`${d}.noAssignments`)}</p>
          )}
        </CardBody>
      </Card>

      {/* Bank Accounts Section */}
      <Card>
        <CardBody className="space-y-3">
          <Typography className="font-semibold flex items-center gap-2" variant="body2">
            <Landmark size={16} />
            {t(`${d}.bankAccounts`)} ({concept.bankAccounts?.length ?? 0})
          </Typography>

          {concept.bankAccounts && concept.bankAccounts.length > 0 ? (
            <div className="space-y-2">
              {}
              {concept.bankAccounts.map((link: any) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                >
                  <CreditCard className="text-default-400 shrink-0" size={16} />
                  {link.bankAccount ? (
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {link.bankAccount.displayName}
                        {link.bankAccount.maskedAccountNumber && (
                          <span className="text-default-400 font-normal">
                            {' '}
                            · {link.bankAccount.maskedAccountNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-default-500 truncate">
                        {link.bankAccount.bankName} · {link.bankAccount.accountHolderName}
                      </p>
                      <p className="text-xs text-default-400">
                        {link.bankAccount.currency} ·{' '}
                        {link.bankAccount.accountCategory === 'national'
                          ? 'Nacional'
                          : 'Internacional'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-default-400">{link.bankAccountId}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-default-400">{t(`${d}.noBankAccounts`)}</p>
          )}
        </CardBody>
      </Card>

      {/* Related Services Modal */}
      <RelatedServicesModal
        conceptId={conceptId}
        condominiumId={condominiumId}
        currencyCode={conceptAny?.currency?.code ?? ''}
        currencySymbol={conceptAny?.currency?.symbol ?? ''}
        isOpen={servicesOpen}
        managementCompanyId={managementCompanyId}
        onClose={() => setServicesOpen(false)}
      />

      {/* Affected Units Modal */}
      <AffectedUnitsModal
        conceptId={conceptId}
        currencyCode={conceptAny?.currency?.code ?? ''}
        currencySymbol={conceptAny?.currency?.symbol ?? ''}
        isOpen={affectedUnitsOpen}
        isRecurring={concept.isRecurring}
        managementCompanyId={managementCompanyId}
        onClose={() => setAffectedUnitsOpen(false)}
      />

      {/* Change History Section */}
      {/* Delinquency Modal */}
      <DelinquencyModal
        conceptId={conceptId}
        currencyCode={conceptAny?.currency?.code ?? ''}
        currencySymbol={conceptAny?.currency?.symbol ?? ''}
        isOpen={delinquencyOpen}
        managementCompanyId={managementCompanyId}
        onClose={() => setDelinquencyOpen(false)}
      />

      {/* Edit Wizard Modal */}
      <CreatePaymentConceptWizard
        buildings={buildings}
        condominiumId={condominiumId}
        currencies={currencies}
        editConceptId={conceptId}
        isOpen={editWizardOpen}
        managementCompanyId={managementCompanyId}
        onClose={() => setEditWizardOpen(false)}
      />
    </div>
  )
}
