'use client'

import { useMemo, useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Layers,
  Landmark,
  Ban,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import type { TPaymentConceptAssignment, TPaymentConceptBankAccount } from '@packages/domain'
import {
  usePaymentConceptDetail,
  useDeactivatePaymentConcept,
  useDeactivateAssignment,
  paymentConceptKeys,
  useQueryClient,
} from '@packages/http-client'

interface PaymentConceptDetailModalProps {
  isOpen: boolean
  onClose: () => void
  conceptId: string | null
  managementCompanyId: string
  onGenerateCharges?: (conceptId: string) => void
}

const TYPE_COLORS = {
  maintenance: 'primary',
  condominium_fee: 'secondary',
  extraordinary: 'warning',
  fine: 'danger',
  other: 'default',
} as const

export function PaymentConceptDetailModal({
  isOpen,
  onClose,
  conceptId,
  managementCompanyId,
  onGenerateCharges,
}: PaymentConceptDetailModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const d = 'admin.condominiums.detail.paymentConcepts.detail'
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const { data, isLoading } = usePaymentConceptDetail({
    companyId: managementCompanyId,
    conceptId: conceptId ?? '',
    enabled: isOpen && !!conceptId && !!managementCompanyId,
  })

  const concept = data?.data

  const deactivateConcept = useDeactivatePaymentConcept(managementCompanyId, {
    onSuccess: () => {
      toast.success(t(`${d}.deactivated`))
      queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      setConfirmDeactivate(false)
      onClose()
    },
    onError: () => toast.error(t(`${d}.deactivateError`)),
  })

  const deactivateAssignment = useDeactivateAssignment(
    managementCompanyId,
    conceptId ?? '',
    {
      onSuccess: () => {
        toast.success(t(`${d}.assignmentDeactivated`))
        queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      },
      onError: () => toast.error(t(`${d}.assignmentDeactivateError`)),
    }
  )

  const typeLabels = useMemo(
    () => ({
      maintenance: t('admin.paymentConcepts.types.maintenance'),
      condominium_fee: t('admin.paymentConcepts.types.condominiumFee'),
      extraordinary: t('admin.paymentConcepts.types.extraordinary'),
      fine: t('admin.paymentConcepts.types.fine'),
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

  const handleClose = () => {
    setConfirmDeactivate(false)
    onClose()
  }

  const formatAdjustment = (type: string, value: number | null) => {
    if (type === 'none' || !value) return t(`${d}.none`)
    if (type === 'percentage') return `${value}%`
    return `${value}`
  }

  if (!conceptId) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {isLoading || !concept ? (
          <ModalBody>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </ModalBody>
        ) : (
          <>
            {/* Header */}
            <ModalHeader className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="text-primary" size={20} />
                <div>
                  <span className="text-lg font-semibold">{concept.name}</span>
                  {concept.description && (
                    <p className="text-sm text-default-500 font-normal">{concept.description}</p>
                  )}
                </div>
              </div>
              <Chip
                color={concept.isActive ? 'success' : 'default'}
                variant="flat"
                size="sm"
              >
                {concept.isActive ? t('common.status.active') : t('common.status.inactive')}
              </Chip>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Basic Info Section */}
              <Card>
                <CardBody className="space-y-3">
                  <Typography variant="body2" className="font-semibold flex items-center gap-2">
                    <Layers size={16} />
                    {t(`${d}.basicInfo`)}
                  </Typography>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-default-500">{t(`${d}.type`)}</span>
                      <div className="mt-1">
                        <Chip
                          color={TYPE_COLORS[concept.conceptType as keyof typeof TYPE_COLORS] || 'default'}
                          variant="flat"
                          size="sm"
                        >
                          {typeLabels[concept.conceptType as keyof typeof typeLabels] || concept.conceptType}
                        </Chip>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-default-500">{t(`${d}.currency`)}</span>
                      <p className="text-sm font-medium mt-1">{concept.currency?.code ?? concept.currencyId}</p>
                    </div>
                    <div>
                      <span className="text-xs text-default-500">{t(`${d}.recurring`)}</span>
                      <p className="text-sm mt-1">
                        {concept.isRecurring ? t('common.yes') : t('common.no')}
                        {concept.isRecurring && concept.recurrencePeriod && (
                          <span className="text-default-500">
                            {' '}({recurrenceLabels[concept.recurrencePeriod as keyof typeof recurrenceLabels]})
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
              {(concept.isRecurring || concept.latePaymentType !== 'none' || concept.earlyPaymentType !== 'none') && (
                <Card>
                  <CardBody className="space-y-3">
                    <Typography variant="body2" className="font-semibold flex items-center gap-2">
                      <Clock size={16} />
                      {t(`${d}.chargeConfig`)}
                    </Typography>

                    <div className="grid grid-cols-2 gap-3">
                      {concept.isRecurring && (
                        <>
                          <div>
                            <span className="text-xs text-default-500">{t(`${d}.issueDay`)}</span>
                            <p className="text-sm mt-1 flex items-center gap-1">
                              <CalendarDays size={14} className="text-default-400" />
                              {concept.issueDay ?? '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-default-500">{t(`${d}.dueDay`)}</span>
                            <p className="text-sm mt-1 flex items-center gap-1">
                              <CalendarDays size={14} className="text-default-400" />
                              {concept.dueDay ?? '-'}
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
                                {' '}({concept.latePaymentGraceDays} {t(`${d}.graceDays`)})
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
                                {' '}({concept.earlyPaymentDaysBeforeDue} {t(`${d}.daysBefore`)})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Assignments Section */}
              <Card>
                <CardBody className="space-y-3">
                  <Typography variant="body2" className="font-semibold flex items-center gap-2">
                    <DollarSign size={16} />
                    {t(`${d}.assignments`)} ({concept.assignments?.length ?? 0})
                  </Typography>

                  {concept.assignments && concept.assignments.length > 0 ? (
                    <div className="space-y-2">
                      {concept.assignments.map((assignment: TPaymentConceptAssignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-lg border border-default-200 p-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Chip size="sm" variant="flat" color="primary">
                                {scopeLabels[assignment.scopeType as keyof typeof scopeLabels]}
                              </Chip>
                              <Chip size="sm" variant="flat">
                                {methodLabels[assignment.distributionMethod as keyof typeof methodLabels]}
                              </Chip>
                              {!assignment.isActive && (
                                <Chip size="sm" variant="flat" color="default">
                                  {t('common.status.inactive')}
                                </Chip>
                              )}
                            </div>
                            <p className="text-sm font-medium">{assignment.amount.toLocaleString()}</p>
                          </div>
                          {assignment.isActive && concept.isActive && (
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              isIconOnly
                              onPress={() => deactivateAssignment.mutate({ assignmentId: assignment.id })}
                              isLoading={deactivateAssignment.isPending}
                            >
                              <Ban size={14} />
                            </Button>
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
                  <Typography variant="body2" className="font-semibold flex items-center gap-2">
                    <Landmark size={16} />
                    {t(`${d}.bankAccounts`)} ({concept.bankAccounts?.length ?? 0})
                  </Typography>

                  {concept.bankAccounts && concept.bankAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {concept.bankAccounts.map((link: TPaymentConceptBankAccount) => (
                        <div
                          key={link.id}
                          className="flex items-center gap-3 rounded-lg border border-default-200 p-3"
                        >
                          <CreditCard size={16} className="text-default-400" />
                          <span className="text-sm">{link.bankAccountId}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-default-400">{t(`${d}.noBankAccounts`)}</p>
                  )}
                </CardBody>
              </Card>

              {/* Deactivate Confirmation */}
              {confirmDeactivate && (
                <div className="rounded-lg bg-danger-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-danger" size={18} />
                    <Typography variant="body2" className="font-semibold text-danger">
                      {t(`${d}.deactivateConfirm`)}
                    </Typography>
                  </div>
                  <p className="text-sm text-danger-700">{t(`${d}.deactivateWarning`)}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => setConfirmDeactivate(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      isLoading={deactivateConcept.isPending}
                      onPress={() => deactivateConcept.mutate({ conceptId: conceptId! })}
                    >
                      {t(`${d}.confirmDeactivate`)}
                    </Button>
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-between">
              <div className="flex gap-2">
                {concept.isActive && (
                  <>
                    <Button
                      color="danger"
                      variant="flat"
                      size="sm"
                      startContent={<Ban size={14} />}
                      onPress={() => setConfirmDeactivate(true)}
                      isDisabled={confirmDeactivate}
                    >
                      {t(`${d}.deactivate`)}
                    </Button>
                    {concept.isRecurring && onGenerateCharges && (
                      <Button
                        color="primary"
                        variant="flat"
                        size="sm"
                        startContent={<Zap size={14} />}
                        onPress={() => onGenerateCharges(conceptId!)}
                      >
                        {t(`${d}.generateCharges`)}
                      </Button>
                    )}
                  </>
                )}
              </div>
              <Button variant="flat" onPress={handleClose}>
                {t(`${d}.close`)}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
