'use client'

import type { TWizardExecutionData } from '@packages/domain'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  useCreatePaymentConceptFull,
  useUpdatePaymentConceptFull,
  usePaymentConceptDetail,
  usePaymentConceptServices,
  useInterestConfigsByPaymentConcept,
  paymentConceptKeys,
  useQueryClient,
  HttpError,
  isApiValidationError,
  type IAssignmentInput,
} from '@packages/http-client'

import { BasicInfoStep } from './steps/BasicInfoStep'
import { ChargeConfigStep } from './steps/ChargeConfigStep'
import { ServicesStep } from './steps/ServicesStep'
import { AssignmentsStep } from './steps/AssignmentsStep'
import { BankAccountsStep } from './steps/BankAccountsStep'
import { ReviewStep } from './steps/ReviewStep'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { useWizardAutoDraft } from '@/hooks/useWizardAutoDraft'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IWizardService {
  serviceId: string
  serviceName: string
  amount: number
  /** Execution data captured in the wizard — mandatory before submit */
  execution?: TWizardExecutionData
}

export interface IWizardAssignment {
  scopeType: 'condominium' | 'building' | 'unit'
  buildingId?: string
  unitIds?: string[]
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
}

export type TChargeGenerationStrategy = 'auto' | 'bulk' | 'manual'

export interface IWizardFormData {
  // Step 1 - Basic Info
  name: string
  description: string
  conceptType: string
  currencyId: string
  effectiveFrom: string
  effectiveUntil: string
  isRecurring: boolean
  recurrencePeriod: string | null
  chargeGenerationStrategy: TChargeGenerationStrategy
  // Step 2 - Charge Config
  issueDay: number | null
  dueDay: number | null
  allowsPartialPayment: boolean
  latePaymentType: 'none' | 'percentage' | 'fixed'
  latePaymentValue: number | undefined
  latePaymentGraceDays: number
  earlyPaymentType: 'none' | 'percentage' | 'fixed'
  earlyPaymentValue: number | undefined
  earlyPaymentDaysBeforeDue: number
  // Step 2 - Interest Config
  interestEnabled: boolean
  interestType: 'simple' | 'compound'
  interestRate: number | undefined
  interestCalculationPeriod: 'monthly' | 'daily'
  interestGracePeriodDays: number
  // Step 3 - Services
  fixedAmount: number
  services: IWizardService[]
  // Step 4 - Assignments
  assignments: IWizardAssignment[]
  // Step 5 - Bank Accounts
  bankAccountIds: string[]
  // Step 6 - Review
  notifyImmediately: boolean
  /** Reason for the change — only used in edit mode */
  changeReason: string
}

const INITIAL_FORM_DATA: IWizardFormData = {
  name: '',
  description: '',
  conceptType: '',
  currencyId: '',
  effectiveFrom: '',
  effectiveUntil: '',
  isRecurring: true,
  recurrencePeriod: 'monthly',
  chargeGenerationStrategy: 'auto',
  issueDay: null,
  dueDay: null,
  allowsPartialPayment: true,
  latePaymentType: 'none',
  latePaymentValue: undefined,
  latePaymentGraceDays: 0,
  earlyPaymentType: 'none',
  earlyPaymentValue: undefined,
  earlyPaymentDaysBeforeDue: 0,
  interestEnabled: false,
  interestType: 'simple',
  interestRate: undefined,
  interestCalculationPeriod: 'monthly',
  interestGracePeriodDays: 0,
  fixedAmount: 0,
  services: [],
  assignments: [],
  bankAccountIds: [],
  notifyImmediately: true,
  changeReason: '',
}

const SERVICES_REQUIRED_TYPES = ['maintenance'] as const

const STEPS = [
  'basicInfo',
  'chargeConfig',
  'services',
  'assignments',
  'bankAccounts',
  'review',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CreatePaymentConceptWizardProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; name?: string }>
  buildings: Array<{ id: string; name: string }>
  /** When provided, the wizard enters edit mode and loads the existing concept */
  editConceptId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreatePaymentConceptWizard({
  isOpen,
  onClose,
  condominiumId,
  managementCompanyId,
  currencies,
  buildings,
  editConceptId,
}: CreatePaymentConceptWizardProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard'
  const isEditMode = !!editConceptId

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<IWizardFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [editDataLoaded, setEditDataLoaded] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const draftRestoredRef = useRef(false)
  const draftInitializedRef = useRef(false)
  const skipNextSaveRef = useRef(false)

  const { draft, isLoadingDraft, saveDraft, clearDraft } = useWizardAutoDraft<IWizardFormData>({
    wizardType: 'payment_concept',
    entityId: condominiumId,
    enabled: !isEditMode && isOpen,
  })

  const { mutateAsync: createConceptFull } = useCreatePaymentConceptFull(managementCompanyId)
  const { mutateAsync: updateConceptFull } = useUpdatePaymentConceptFull(managementCompanyId)

  // Load existing concept data for edit mode
  const { data: editConceptData, isLoading: isLoadingEdit } = usePaymentConceptDetail({
    companyId: managementCompanyId,
    conceptId: editConceptId ?? '',
    enabled: isEditMode && isOpen,
  })

  // Load linked services for edit mode
  const { data: editServicesData, isFetched: editServicesFetched } = usePaymentConceptServices({
    companyId: managementCompanyId,
    conceptId: editConceptId ?? '',
    enabled: isEditMode && isOpen,
  })

  // Load interest configurations for edit mode
  const { data: editInterestData, isFetched: editInterestFetched } =
    useInterestConfigsByPaymentConcept({
      paymentConceptId: editConceptId ?? '',
      enabled: isEditMode && isOpen,
    })

  // Pre-populate form when editing — wait for concept, services, and interest configs to load
  useEffect(() => {
    if (
      !isEditMode ||
      !editConceptData?.data ||
      !editServicesFetched ||
      !editInterestFetched ||
      editDataLoaded
    )
      return
    const c = editConceptData.data
    const svcs = editServicesData?.data ?? []
    const interestConfigs = editInterestData?.data ?? []
    const activeInterest = interestConfigs.find((ic: any) => ic.isActive) ?? interestConfigs[0]

    setFormData({
      name: c.name,
      description: c.description ?? '',
      conceptType: c.conceptType,
      currencyId: c.currencyId,
      effectiveFrom: c.effectiveFrom ? new Date(c.effectiveFrom).toISOString().split('T')[0]! : '',
      effectiveUntil: c.effectiveUntil
        ? new Date(c.effectiveUntil).toISOString().split('T')[0]!
        : '',
      isRecurring: c.isRecurring,
      recurrencePeriod: c.recurrencePeriod ?? 'monthly',
      chargeGenerationStrategy: 'auto',
      issueDay: c.issueDay ?? null,
      dueDay: c.dueDay ?? null,
      allowsPartialPayment: c.allowsPartialPayment,
      latePaymentType: (c.latePaymentType as IWizardFormData['latePaymentType']) ?? 'none',
      latePaymentValue: c.latePaymentValue ?? undefined,
      latePaymentGraceDays: c.latePaymentGraceDays ?? 0,
      earlyPaymentType: (c.earlyPaymentType as IWizardFormData['earlyPaymentType']) ?? 'none',
      earlyPaymentValue: c.earlyPaymentValue ?? undefined,
      earlyPaymentDaysBeforeDue: c.earlyPaymentDaysBeforeDue ?? 0,
      interestEnabled: !!activeInterest,
      interestType: (activeInterest?.interestType as IWizardFormData['interestType']) ?? 'simple',
      interestRate: activeInterest?.interestRate ? Number(activeInterest.interestRate) : undefined,
      interestCalculationPeriod:
        (activeInterest?.calculationPeriod as IWizardFormData['interestCalculationPeriod']) ??
        'monthly',
      interestGracePeriodDays: activeInterest?.gracePeriodDays ?? 0,
      fixedAmount:
        svcs.length > 0
          ? 0
          : Number((c.assignments ?? []).find((a: any) => a.isActive)?.amount ?? 0),
      services: svcs.map((s: any) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName ?? s.serviceId,
        amount: Number(s.amount),
      })),
      assignments: (c.assignments ?? [])
        .filter((a: any) => a.isActive)
        .map((a: any) => ({
          scopeType: a.scopeType as IWizardAssignment['scopeType'],
          buildingId: a.buildingId ?? undefined,
          unitIds: a.unitId ? [a.unitId] : undefined,
          distributionMethod: a.distributionMethod as IWizardAssignment['distributionMethod'],
          amount: a.amount,
        })),
      bankAccountIds: (c.bankAccounts ?? []).map((b: any) => b.bankAccountId),
      notifyImmediately: true,
      changeReason: '',
    })
    setEditDataLoaded(true)
  }, [
    isEditMode,
    editConceptData,
    editServicesFetched,
    editServicesData,
    editInterestFetched,
    editInterestData,
    editDataLoaded,
  ])

  // Reset editDataLoaded when modal closes or editConceptId changes
  useEffect(() => {
    if (!isOpen) {
      setEditDataLoaded(false)
    }
  }, [isOpen])

  // Restore draft when loaded (create mode only)
  useEffect(() => {
    if (isEditMode || draftInitializedRef.current || isLoadingDraft || !isOpen) return
    draftInitializedRef.current = true

    if (draft) {
      draftRestoredRef.current = true
      skipNextSaveRef.current = true
      setFormData({ ...INITIAL_FORM_DATA, ...draft.data })
      setCurrentStep(draft.currentStep)
      setDraftRestored(true)
    }
  }, [isEditMode, isLoadingDraft, draft, isOpen])

  // Auto-save draft on formData/currentStep changes (create mode only)
  useEffect(() => {
    if (isEditMode || !draftInitializedRef.current || !isOpen) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false

      return
    }
    saveDraft(formData, currentStep)
  }, [formData, currentStep, saveDraft, isEditMode, isOpen])

  // Reset draft state when modal closes
  useEffect(() => {
    if (!isOpen) {
      draftInitializedRef.current = false
      draftRestoredRef.current = false
      setDraftRestored(false)
    }
  }, [isOpen])

  // Default to VES currency when currencies load (create mode only, skip if draft restored)
  useEffect(() => {
    if (isEditMode || draftRestoredRef.current) return
    if (!formData.currencyId && currencies.length > 0) {
      const ves = currencies.find(c => c.code === 'VES')

      if (ves) {
        setFormData(prev => ({ ...prev, currencyId: ves.id }))
      }
    }
  }, [currencies, isEditMode])

  const updateFormData = useCallback((updates: Partial<IWizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleBack = useCallback(() => {
    setShowErrors(false)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const handleClose = useCallback(() => {
    setCurrentStep(0)
    setFormData(INITIAL_FORM_DATA)
    setShowErrors(false)
    onClose()
  }, [onClose])

  // Compute total amount from services or fixed amount
  const servicesTotalAmount =
    formData.services.length > 0
      ? formData.services.reduce((sum, s) => sum + s.amount, 0)
      : formData.fixedAmount

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        if (
          !(formData.name && formData.conceptType && formData.currencyId && formData.effectiveFrom)
        )
          return false
        if (formData.isRecurring && !formData.recurrencePeriod) return false
        if (
          formData.isRecurring &&
          formData.chargeGenerationStrategy === 'bulk' &&
          !formData.effectiveUntil
        )
          return false

        return true
      case 1: // Charge Config
        if (formData.issueDay == null || formData.dueDay == null) return false
        if (formData.latePaymentType !== 'none' && !formData.latePaymentValue) return false
        if (
          formData.earlyPaymentType !== 'none' &&
          (!formData.earlyPaymentValue || !formData.earlyPaymentDaysBeforeDue)
        )
          return false
        if (formData.interestEnabled && !formData.interestRate) return false

        return true
      case 2: // Services
        if (SERVICES_REQUIRED_TYPES.includes(formData.conceptType as any)) {
          return formData.services.length > 0 && formData.services.every(s => !!s.execution)
        }

        return (
          (formData.services.length > 0 && formData.services.every(s => !!s.execution)) ||
          formData.fixedAmount > 0
        )
      case 3: // Assignments
        return formData.assignments.length > 0
      case 4: // Bank Accounts (required)
        return formData.bankAccountIds.length > 0
      case 5: // Review
        return true
      default:
        return false
    }
  }

  const handleSubmitEdit = useCallback(async () => {
    if (!editConceptId) return
    setIsSubmitting(true)
    try {
      // Build assignments array for the update
      type TAssignmentInput = {
        scopeType: string
        condominiumId: string
        buildingId?: string
        unitId?: string
        distributionMethod: string
        amount: number
      }
      const assignments: TAssignmentInput[] = []

      for (const a of formData.assignments) {
        if (a.scopeType === 'unit' && a.unitIds?.length) {
          for (const unitId of a.unitIds) {
            assignments.push({
              scopeType: 'unit',
              condominiumId,
              unitId,
              distributionMethod: 'fixed_per_unit',
              amount: a.amount,
            })
          }
        } else {
          assignments.push({
            scopeType: a.scopeType,
            condominiumId,
            buildingId: a.buildingId,
            distributionMethod: a.distributionMethod,
            amount: a.amount,
          })
        }
      }

      await updateConceptFull({
        conceptId: editConceptId,
        notes: formData.changeReason || null,
        name: formData.name,
        description: formData.description || null,
        conceptType: formData.conceptType,
        currencyId: formData.currencyId,
        isRecurring: formData.isRecurring,
        recurrencePeriod: formData.isRecurring ? formData.recurrencePeriod : null,
        issueDay: formData.issueDay,
        dueDay: formData.dueDay,
        effectiveFrom: formData.effectiveFrom ? new Date(formData.effectiveFrom) : null,
        effectiveUntil: formData.effectiveUntil ? new Date(formData.effectiveUntil) : null,
        allowsPartialPayment: formData.allowsPartialPayment,
        latePaymentType: formData.latePaymentType,
        latePaymentValue: formData.latePaymentValue ?? null,
        latePaymentGraceDays: formData.latePaymentGraceDays,
        earlyPaymentType: formData.earlyPaymentType,
        earlyPaymentValue: formData.earlyPaymentValue ?? null,
        earlyPaymentDaysBeforeDue: formData.earlyPaymentDaysBeforeDue,
        assignments,
        bankAccountIds: formData.bankAccountIds,
        services: formData.services.map(s => ({
          serviceId: s.serviceId,
          amount: s.amount,
          useDefaultAmount: false,
        })),
      })

      await queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      toast.success(t(`${w}.editSuccess`))
      handleClose()
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        const details = error.details

        if (isApiValidationError(details)) {
          const fieldMessages = details.error.fields
            .map((f: any) => f.messages.join(', '))
            .join('\n')

          toast.error(fieldMessages || error.message)
        } else {
          toast.error(error.message)
        }
      } else if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    formData,
    editConceptId,
    condominiumId,
    updateConceptFull,
    queryClient,
    handleClose,
    toast,
    t,
  ])

  const handleSubmitCreate = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const assignments = formData.assignments.flatMap((assignment): IAssignmentInput[] => {
        if (assignment.scopeType === 'unit' && assignment.unitIds?.length) {
          return assignment.unitIds.map(unitId => ({
            scopeType: 'unit' as const,
            condominiumId,
            unitId,
            distributionMethod: 'fixed_per_unit' as const,
            amount: assignment.amount,
          }))
        }

        return [
          {
            scopeType: assignment.scopeType as 'condominium' | 'building' | 'unit',
            condominiumId,
            buildingId: assignment.buildingId,
            distributionMethod: assignment.distributionMethod as
              | 'by_aliquot'
              | 'equal_split'
              | 'fixed_per_unit',
            amount: assignment.amount,
          },
        ]
      })

      await createConceptFull({
        condominiumId,
        name: formData.name,
        description: formData.description || undefined,
        conceptType: formData.conceptType as any,
        currencyId: formData.currencyId,
        isActive: true,
        isRecurring: formData.isRecurring,
        recurrencePeriod: formData.isRecurring ? (formData.recurrencePeriod as any) : null,
        issueDay: formData.issueDay,
        dueDay: formData.dueDay,
        effectiveFrom: formData.effectiveFrom ? new Date(formData.effectiveFrom) : null,
        effectiveUntil: formData.effectiveUntil ? new Date(formData.effectiveUntil) : null,
        allowsPartialPayment: formData.allowsPartialPayment,
        latePaymentType: formData.latePaymentType as any,
        latePaymentValue: formData.latePaymentValue ?? null,
        latePaymentGraceDays: formData.latePaymentGraceDays,
        earlyPaymentType: formData.earlyPaymentType as any,
        earlyPaymentValue: formData.earlyPaymentValue ?? null,
        chargeGenerationStrategy: formData.chargeGenerationStrategy,
        earlyPaymentDaysBeforeDue: formData.earlyPaymentDaysBeforeDue,
        services: formData.services.map(s => ({
          serviceId: s.serviceId,
          amount: s.amount,
          useDefaultAmount: false,
          execution: s.execution!,
        })),
        assignments,
        bankAccountIds: formData.bankAccountIds,
        interestConfig:
          formData.interestEnabled && formData.interestRate
            ? {
                name: `${formData.name} - Interest`,
                interestType: formData.interestType as 'simple' | 'compound' | 'fixed_amount',
                interestRate: formData.interestRate,
                calculationPeriod: formData.interestCalculationPeriod,
                gracePeriodDays: formData.interestGracePeriodDays,
                isActive: true,
                effectiveFrom: new Date().toISOString().split('T')[0]!,
              }
            : undefined,
      })

      clearDraft()
      await queryClient.invalidateQueries({ queryKey: paymentConceptKeys.all })
      toast.success(t(`${w}.success`))
      handleClose()
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        const details = error.details

        if (isApiValidationError(details)) {
          const fieldMessages = details.error.fields
            .map((f: any) => f.messages.join(', '))
            .join('\n')

          toast.error(fieldMessages || error.message)
        } else {
          toast.error(error.message)
        }
      } else if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, condominiumId, createConceptFull, clearDraft, queryClient, handleClose, toast, t])

  const handleSubmit = isEditMode ? handleSubmitEdit : handleSubmitCreate

  const wizardSteps: IStepItem<(typeof STEPS)[number]>[] = [
    { key: 'basicInfo', title: t(`${w}.steps.basicInfo`) },
    { key: 'chargeConfig', title: t(`${w}.steps.chargeConfig`) },
    { key: 'services', title: t(`${w}.steps.services`) },
    { key: 'assignments', title: t(`${w}.steps.assignments`) },
    { key: 'bankAccounts', title: t(`${w}.steps.bankAccounts`) },
    { key: 'review', title: t(`${w}.steps.review`) },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            currencies={currencies}
            formData={formData}
            showErrors={showErrors}
            onUpdate={updateFormData}
          />
        )
      case 1:
        return (
          <ChargeConfigStep
            currencies={currencies}
            formData={formData}
            showErrors={showErrors}
            onUpdate={updateFormData}
          />
        )
      case 2:
        return (
          <ServicesStep
            condominiumId={condominiumId}
            currencies={currencies}
            formData={formData}
            isRecurring={formData.isRecurring}
            managementCompanyId={managementCompanyId}
            servicesRequired={SERVICES_REQUIRED_TYPES.includes(formData.conceptType as any)}
            showErrors={showErrors}
            onUpdate={updateFormData}
          />
        )
      case 3:
        return (
          <AssignmentsStep
            buildings={buildings}
            condominiumId={condominiumId}
            currencies={currencies}
            formData={formData}
            managementCompanyId={managementCompanyId}
            servicesTotalAmount={servicesTotalAmount}
            showErrors={showErrors}
            onUpdate={updateFormData}
          />
        )
      case 4:
        return (
          <BankAccountsStep
            currencies={currencies}
            formData={formData}
            managementCompanyId={managementCompanyId}
            showErrors={showErrors}
            onUpdate={updateFormData}
          />
        )
      case 5:
        return (
          <ReviewStep
            buildings={buildings}
            currencies={currencies}
            formData={formData}
            isEditMode={isEditMode}
            managementCompanyId={managementCompanyId}
            onUpdate={updateFormData}
          />
        )
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="3xl" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <Typography variant="h4">{isEditMode ? t(`${w}.editTitle`) : t(`${w}.title`)}</Typography>
          <Stepper
            color="primary"
            currentStep={STEPS[currentStep]!}
            steps={wizardSteps}
            onStepChange={stepKey => {
              const stepIndex = STEPS.indexOf(stepKey)

              if (stepIndex >= 0 && stepIndex <= currentStep) {
                setShowErrors(false)
                setCurrentStep(stepIndex)
              }
            }}
          />
        </ModalHeader>

        <ModalBody>
          {(!isEditMode && isLoadingDraft) || (isEditMode && isLoadingEdit) ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {draftRestored && (
                <div className="mb-4 flex items-center justify-between rounded-lg bg-default-100 p-3">
                  <span className="text-sm text-default-600">{t(`${w}.draftRestored`)}</span>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      clearDraft()
                      skipNextSaveRef.current = true
                      setFormData(INITIAL_FORM_DATA)
                      setCurrentStep(0)
                      setDraftRestored(false)
                    }}
                  >
                    {t(`${w}.discardDraft`)}
                  </Button>
                </div>
              )}
              {renderStepContent()}
            </>
          )}
        </ModalBody>

        <ModalFooter className="justify-end">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="flat" onPress={handleBack}>
                {t('common.back')}
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button
                color="primary"
                onPress={() => {
                  if (canProceed()) {
                    setShowErrors(false)
                    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
                  } else {
                    setShowErrors(true)
                  }
                }}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button
                color="primary"
                isDisabled={isSubmitting || (isEditMode && isLoadingEdit)}
                isLoading={isSubmitting}
                onPress={handleSubmit}
              >
                {isSubmitting
                  ? t(isEditMode ? `${w}.saving` : `${w}.creating`)
                  : t(isEditMode ? `${w}.save` : `${w}.create`)}
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
