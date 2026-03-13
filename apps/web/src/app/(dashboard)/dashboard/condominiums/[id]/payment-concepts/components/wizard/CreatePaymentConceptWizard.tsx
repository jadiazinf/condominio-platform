'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import type { TWizardExecutionData } from '@packages/domain'
import {
  useCreatePaymentConceptFull,
  useUpdatePaymentConceptFull,
  useCreateAssignment,
  useLinkBankAccount,
  useCreateInterestConfiguration,
  useGenerateChargesBulk,
  usePaymentConceptDetail,
  usePaymentConceptServices,
  paymentConceptKeys,
  useQueryClient,
  HttpError,
  isApiValidationError,
} from '@packages/http-client'

import { BasicInfoStep } from './steps/BasicInfoStep'
import { ChargeConfigStep } from './steps/ChargeConfigStep'
import { ServicesStep } from './steps/ServicesStep'
import { AssignmentsStep } from './steps/AssignmentsStep'
import { BankAccountsStep } from './steps/BankAccountsStep'
import { ReviewStep } from './steps/ReviewStep'

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
  notifyImmediately: false,
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

  const { mutateAsync: createConceptFull } = useCreatePaymentConceptFull(managementCompanyId)
  const { mutateAsync: updateConceptFull } = useUpdatePaymentConceptFull(managementCompanyId)
  const { mutateAsync: createAssignment } = useCreateAssignment(managementCompanyId)
  const { mutateAsync: linkBankAccount } = useLinkBankAccount(managementCompanyId)
  const { mutateAsync: createInterestConfig } = useCreateInterestConfiguration()
  const { mutateAsync: generateBulk } = useGenerateChargesBulk(managementCompanyId)

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

  // Pre-populate form when editing — wait for both concept and services to load
  useEffect(() => {
    if (!isEditMode || !editConceptData?.data || !editServicesFetched || editDataLoaded) return
    const c = editConceptData.data
    const svcs = editServicesData?.data ?? []
    setFormData({
      name: c.name,
      description: c.description ?? '',
      conceptType: c.conceptType,
      currencyId: c.currencyId,
      effectiveFrom: c.effectiveFrom ? new Date(c.effectiveFrom).toISOString().split('T')[0]! : '',
      effectiveUntil: c.effectiveUntil ? new Date(c.effectiveUntil).toISOString().split('T')[0]! : '',
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
      interestEnabled: false,
      interestType: 'simple',
      interestRate: undefined,
      interestCalculationPeriod: 'monthly',
      interestGracePeriodDays: 0,
      fixedAmount: svcs.length > 0
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
      notifyImmediately: false,
      changeReason: '',
    })
    setEditDataLoaded(true)
  }, [isEditMode, editConceptData, editServicesFetched, editServicesData, editDataLoaded])

  // Reset editDataLoaded when modal closes or editConceptId changes
  useEffect(() => {
    if (!isOpen) {
      setEditDataLoaded(false)
    }
  }, [isOpen])

  // Default to VES currency when currencies load (create mode only)
  useEffect(() => {
    if (isEditMode) return
    if (!formData.currencyId && currencies.length > 0) {
      const ves = currencies.find(c => c.code === 'VES')
      if (ves) {
        setFormData(prev => ({ ...prev, currencyId: ves.id }))
      }
    }
  }, [currencies, isEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const servicesTotalAmount = formData.services.length > 0
    ? formData.services.reduce((sum, s) => sum + s.amount, 0)
    : formData.fixedAmount

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        if (!(formData.name && formData.conceptType && formData.currencyId && formData.effectiveFrom))
          return false
        if (formData.isRecurring && !formData.recurrencePeriod) return false
        if (formData.isRecurring && formData.chargeGenerationStrategy === 'bulk' && !formData.effectiveUntil)
          return false
        return true
      case 1: // Charge Config
        if (formData.isRecurring && (formData.issueDay == null || formData.dueDay == null))
          return false
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
        return (formData.services.length > 0 && formData.services.every(s => !!s.execution))
          || formData.fixedAmount > 0
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
      type TAssignmentInput = { scopeType: string; condominiumId: string; buildingId?: string; unitId?: string; distributionMethod: string; amount: number }
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
  }, [formData, editConceptId, condominiumId, updateConceptFull, queryClient, handleClose, toast, t])

  const handleSubmitCreate = useCallback(async () => {
    setIsSubmitting(true)
    try {
      // 1. Create concept + services + executions in a single transaction
      const conceptResult = await createConceptFull({
        condominiumId,
        name: formData.name,
        description: formData.description || undefined,
        conceptType: formData.conceptType as any,
        currencyId: formData.currencyId,
        isRecurring: formData.isRecurring,
        recurrencePeriod: formData.isRecurring ? (formData.recurrencePeriod as any) : null,
        issueDay: formData.issueDay,
        dueDay: formData.dueDay,
        effectiveFrom: formData.effectiveFrom || null,
        effectiveUntil: formData.effectiveUntil || null,
        allowsPartialPayment: formData.allowsPartialPayment,
        latePaymentType: formData.latePaymentType as any,
        latePaymentValue: formData.latePaymentValue ?? null,
        latePaymentGraceDays: formData.latePaymentGraceDays,
        earlyPaymentType: formData.earlyPaymentType as any,
        earlyPaymentValue: formData.earlyPaymentValue ?? null,
        earlyPaymentDaysBeforeDue: formData.earlyPaymentDaysBeforeDue,
        services: formData.services.map(s => ({
          serviceId: s.serviceId,
          amount: s.amount,
          useDefaultAmount: false,
          execution: s.execution!,
        })),
      } as any)

      const conceptId = conceptResult.data.data.id

      // 2. Create assignments
      for (const assignment of formData.assignments) {
        if (assignment.scopeType === 'unit' && assignment.unitIds?.length) {
          for (const unitId of assignment.unitIds) {
            await createAssignment({
              conceptId,
              scopeType: 'unit',
              condominiumId,
              unitId,
              distributionMethod: 'fixed_per_unit',
              amount: assignment.amount,
            })
          }
        } else {
          await createAssignment({
            conceptId,
            scopeType: assignment.scopeType,
            condominiumId,
            buildingId: assignment.buildingId,
            distributionMethod: assignment.distributionMethod,
            amount: assignment.amount,
          })
        }
      }

      // 3. Link bank accounts
      for (const bankAccountId of formData.bankAccountIds) {
        await linkBankAccount({ conceptId, bankAccountId })
      }

      // 4. Create interest configuration if enabled
      if (formData.interestEnabled && formData.interestRate) {
        await createInterestConfig({
          condominiumId,
          paymentConceptId: conceptId,
          name: `${formData.name} - Interest`,
          interestType: formData.interestType,
          interestRate: formData.interestRate,
          calculationPeriod: formData.interestCalculationPeriod,
          gracePeriodDays: formData.interestGracePeriodDays,
          currencyId: formData.currencyId,
          isActive: true,
          effectiveFrom: new Date().toISOString().split('T')[0]!,
        } as any)
      }

      // 5. Bulk-generate all charges if strategy is 'bulk'
      if (formData.isRecurring && formData.chargeGenerationStrategy === 'bulk') {
        await generateBulk({ conceptId })
      }

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
  }, [
    formData,
    condominiumId,
    createConceptFull,
    createAssignment,
    linkBankAccount,
    createInterestConfig,
    queryClient,
    handleClose,
    toast,
    t,
  ])

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
            formData={formData}
            onUpdate={updateFormData}
            currencies={currencies}
            showErrors={showErrors}
          />
        )
      case 1:
        return (
          <ChargeConfigStep
            formData={formData}
            onUpdate={updateFormData}
            showErrors={showErrors}
            currencies={currencies}
          />
        )
      case 2:
        return (
          <ServicesStep
            formData={formData}
            onUpdate={updateFormData}
            condominiumId={condominiumId}
            managementCompanyId={managementCompanyId}
            currencies={currencies}
            showErrors={showErrors}
            servicesRequired={SERVICES_REQUIRED_TYPES.includes(formData.conceptType as any)}
          />
        )
      case 3:
        return (
          <AssignmentsStep
            formData={formData}
            onUpdate={updateFormData}
            buildings={buildings}
            currencies={currencies}
            condominiumId={condominiumId}
            managementCompanyId={managementCompanyId}
            showErrors={showErrors}
            servicesTotalAmount={servicesTotalAmount}
          />
        )
      case 4:
        return (
          <BankAccountsStep
            formData={formData}
            onUpdate={updateFormData}
            managementCompanyId={managementCompanyId}
            currencies={currencies}
            showErrors={showErrors}
          />
        )
      case 5:
        return (
          <ReviewStep
            formData={formData}
            onUpdate={updateFormData}
            currencies={currencies}
            buildings={buildings}
            managementCompanyId={managementCompanyId}
            isEditMode={isEditMode}
          />
        )
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <Typography variant="h4">
            {isEditMode ? t(`${w}.editTitle`) : t(`${w}.title`)}
          </Typography>
          <Stepper
            steps={wizardSteps}
            currentStep={STEPS[currentStep]!}
            color="primary"
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
          {isEditMode && isLoadingEdit ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            renderStepContent()
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
