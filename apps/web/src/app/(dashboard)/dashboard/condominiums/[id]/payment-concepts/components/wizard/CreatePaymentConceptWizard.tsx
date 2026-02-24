'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  useCreatePaymentConcept,
  useCreateAssignment,
  useLinkBankAccount,
  useCreateInterestConfiguration,
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
import { useLinkServiceToConcept } from '@packages/http-client/hooks'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IWizardService {
  serviceId: string
  serviceName: string
  amount: number
  useDefaultAmount: boolean
  originalDefaultAmount?: number
}

export interface IWizardAssignment {
  scopeType: 'condominium' | 'building' | 'unit'
  buildingId?: string
  unitIds?: string[]
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
}

export interface IWizardFormData {
  // Step 1 - Basic Info
  name: string
  description: string
  conceptType: string
  currencyId: string
  isRecurring: boolean
  recurrencePeriod: string | null
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
  services: IWizardService[]
  // Step 4 - Assignments
  assignments: IWizardAssignment[]
  // Step 5 - Bank Accounts
  bankAccountIds: string[]
  // Step 6 - Review
  notifyImmediately: boolean
}

const INITIAL_FORM_DATA: IWizardFormData = {
  name: '',
  description: '',
  conceptType: '',
  currencyId: '',
  isRecurring: true,
  recurrencePeriod: 'monthly',
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
  services: [],
  assignments: [],
  bankAccountIds: [],
  notifyImmediately: false,
}

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
}: CreatePaymentConceptWizardProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard'

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<IWizardFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const { mutateAsync: createConcept } = useCreatePaymentConcept(managementCompanyId)
  const { mutateAsync: createAssignment } = useCreateAssignment(managementCompanyId)
  const { mutateAsync: linkBankAccount } = useLinkBankAccount(managementCompanyId)
  const { mutateAsync: linkService } = useLinkServiceToConcept(managementCompanyId)
  const { mutateAsync: createInterestConfig } = useCreateInterestConfiguration()

  // Default to VES currency when currencies load
  useEffect(() => {
    if (!formData.currencyId && currencies.length > 0) {
      const ves = currencies.find(c => c.code === 'VES')
      if (ves) {
        setFormData(prev => ({ ...prev, currencyId: ves.id }))
      }
    }
  }, [currencies]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Compute total amount from services
  const servicesTotalAmount = formData.services.reduce((sum, s) => sum + s.amount, 0)

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(
          formData.name &&
          formData.conceptType &&
          formData.currencyId &&
          (!formData.isRecurring || formData.recurrencePeriod)
        )
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
        return formData.services.length > 0
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

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      // 1. Create the payment concept
      const conceptResult = await createConcept({
        condominiumId,
        name: formData.name,
        description: formData.description || undefined,
        conceptType: formData.conceptType as any,
        currencyId: formData.currencyId,
        isRecurring: formData.isRecurring,
        recurrencePeriod: formData.isRecurring ? (formData.recurrencePeriod as any) : null,
        issueDay: formData.issueDay,
        dueDay: formData.dueDay,
        allowsPartialPayment: formData.allowsPartialPayment,
        latePaymentType: formData.latePaymentType as any,
        latePaymentValue: formData.latePaymentValue ?? null,
        latePaymentGraceDays: formData.latePaymentGraceDays,
        earlyPaymentType: formData.earlyPaymentType as any,
        earlyPaymentValue: formData.earlyPaymentValue ?? null,
        earlyPaymentDaysBeforeDue: formData.earlyPaymentDaysBeforeDue,
      } as any)

      const conceptId = conceptResult.data.data.id

      // 2. Link services to concept
      for (const service of formData.services) {
        await linkService({
          conceptId,
          serviceId: service.serviceId,
          amount: service.amount,
          useDefaultAmount: service.useDefaultAmount,
        })
      }

      // 3. Create assignments (amount from services total)
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

      // 4. Link bank accounts
      for (const bankAccountId of formData.bankAccountIds) {
        await linkBankAccount({ conceptId, bankAccountId })
      }

      // 5. Create interest configuration if enabled
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
    createConcept,
    linkService,
    createAssignment,
    linkBankAccount,
    createInterestConfig,
    queryClient,
    handleClose,
    toast,
    t,
  ])

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
          <Typography variant="h4">{t(`${w}.title`)}</Typography>
          <Stepper
            steps={wizardSteps}
            currentStep={STEPS[currentStep]!}
            color="success"
            onStepChange={stepKey => {
              const stepIndex = STEPS.indexOf(stepKey)
              if (stepIndex >= 0 && stepIndex <= currentStep) {
                setShowErrors(false)
                setCurrentStep(stepIndex)
              }
            }}
          />
        </ModalHeader>

        <ModalBody>{renderStepContent()}</ModalBody>

        <ModalFooter className="justify-end">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="flat" onPress={handleBack}>
                {t('common.back')}
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button
                color="success"
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
                color="success"
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                onPress={handleSubmit}
              >
                {isSubmitting ? t(`${w}.creating`) : t(`${w}.create`)}
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
