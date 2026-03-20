'use client'

import type { IWizardFormData } from './CreatePaymentConceptWizard'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useCreatePaymentConceptFull,
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

import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { useWizardAutoDraft } from '@/hooks/useWizardAutoDraft'

const INITIAL_FORM_DATA: IWizardFormData = {
  name: '',
  description: '',
  conceptType: '',
  currencyId: '',
  effectiveFrom: '',
  effectiveUntil: '',
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
  fixedAmount: 0,
  services: [],
  assignments: [],
  bankAccountIds: [],
  chargeGenerationStrategy: 'auto',
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

interface CreatePaymentConceptClientProps {
  condominiumId: string
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; name?: string }>
  buildings: Array<{ id: string; name: string }>
}

export function CreatePaymentConceptClient({
  condominiumId,
  managementCompanyId,
  currencies,
  buildings,
}: CreatePaymentConceptClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard'

  const initialConceptType = searchParams.get('conceptType') ?? ''

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<IWizardFormData>({
    ...INITIAL_FORM_DATA,
    conceptType: initialConceptType,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const draftRestoredRef = useRef(false)
  const draftInitializedRef = useRef(false)
  const skipNextSaveRef = useRef(false)

  const { draft, isLoadingDraft, hasDraft, saveDraft, clearDraft } =
    useWizardAutoDraft<IWizardFormData>({
      wizardType: 'payment_concept',
      entityId: condominiumId,
    })

  const { mutateAsync: createConceptFull } = useCreatePaymentConceptFull(managementCompanyId)

  // Restore draft when loaded
  useEffect(() => {
    if (draftInitializedRef.current || isLoadingDraft) return
    draftInitializedRef.current = true

    if (draft) {
      draftRestoredRef.current = true
      skipNextSaveRef.current = true
      setFormData({ ...INITIAL_FORM_DATA, ...draft.data })
      setCurrentStep(draft.currentStep)
      setDraftRestored(true)
    }
  }, [isLoadingDraft, draft])

  // Auto-save draft on formData/currentStep changes
  useEffect(() => {
    if (!draftInitializedRef.current) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false

      return
    }
    saveDraft(formData, currentStep)
  }, [formData, currentStep, saveDraft])

  // Default to VES currency when currencies load (skip if draft restored)
  useEffect(() => {
    if (draftRestoredRef.current) return
    if (!formData.currencyId && currencies.length > 0) {
      const ves = currencies.find(c => c.code === 'VES')

      if (ves) {
        setFormData(prev => ({ ...prev, currencyId: ves.id }))
      }
    }
  }, [currencies])

  const updateFormData = useCallback((updates: Partial<IWizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleBack = useCallback(() => {
    setShowErrors(false)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // Compute total amount from services or fixed amount
  const servicesTotalAmount =
    formData.services.length > 0
      ? formData.services.reduce((sum, s) => sum + s.amount, 0)
      : formData.fixedAmount

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
      case 4: // Bank Accounts
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
      // Build assignments, expanding unit-scope into individual entries
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
      router.push(`/dashboard/condominiums/${condominiumId}/payment-concepts`)
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
  }, [formData, condominiumId, createConceptFull, clearDraft, queryClient, router, toast, t])

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
            managementCompanyId={managementCompanyId}
            onUpdate={updateFormData}
          />
        )
      default:
        return null
    }
  }

  if (isLoadingDraft) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Draft restored banner */}
      {draftRestored && (
        <Card>
          <CardBody className="flex flex-row items-center justify-between p-4">
            <span className="text-sm text-default-600">{t(`${w}.draftRestored`)}</span>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                clearDraft()
                skipNextSaveRef.current = true
                setFormData({ ...INITIAL_FORM_DATA, conceptType: initialConceptType })
                setCurrentStep(0)
                setDraftRestored(false)
              }}
            >
              {t(`${w}.discardDraft`)}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Stepper */}
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

      {/* Step Content */}
      <Card>
        <CardBody className="p-6">{renderStepContent()}</CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end gap-3">
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
            isDisabled={isSubmitting}
            isLoading={isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? t(`${w}.creating`) : t(`${w}.create`)}
          </Button>
        )}
      </div>
    </div>
  )
}
