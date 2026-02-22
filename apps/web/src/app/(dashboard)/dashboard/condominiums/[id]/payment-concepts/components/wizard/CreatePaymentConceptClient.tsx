'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/ui/components/button'
import { Card, CardBody } from '@/ui/components/card'
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
import { AssignmentsStep } from './steps/AssignmentsStep'
import { BankAccountsStep } from './steps/BankAccountsStep'
import { ReviewStep } from './steps/ReviewStep'
import type { IWizardFormData } from './CreatePaymentConceptWizard'

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
  assignments: [],
  bankAccountIds: [],
}

const STEPS = ['basicInfo', 'chargeConfig', 'assignments', 'bankAccounts', 'review'] as const

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
  const queryClient = useQueryClient()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard'

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<IWizardFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const { mutateAsync: createConcept } = useCreatePaymentConcept(managementCompanyId)
  const { mutateAsync: createAssignment } = useCreateAssignment(managementCompanyId)
  const { mutateAsync: linkBankAccount } = useLinkBankAccount(managementCompanyId)
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

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!(formData.name && formData.conceptType && formData.currencyId &&
          (!formData.isRecurring || formData.recurrencePeriod))
      case 1:
        if (formData.isRecurring && (formData.issueDay == null || formData.dueDay == null)) return false
        if (formData.latePaymentType !== 'none' && !formData.latePaymentValue) return false
        if (formData.earlyPaymentType !== 'none' && (!formData.earlyPaymentValue || !formData.earlyPaymentDaysBeforeDue)) return false
        if (formData.interestEnabled && !formData.interestRate) return false
        return true
      case 2:
        return formData.assignments.length > 0
      case 3:
        return formData.bankAccountIds.length > 0
      case 4:
        return true
      default:
        return false
    }
  }

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const conceptResult = await createConcept({
        condominiumId,
        name: formData.name,
        description: formData.description || undefined,
        conceptType: formData.conceptType as any,
        currencyId: formData.currencyId,
        isRecurring: formData.isRecurring,
        recurrencePeriod: formData.isRecurring ? formData.recurrencePeriod as any : null,
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

      for (const bankAccountId of formData.bankAccountIds) {
        await linkBankAccount({ conceptId, bankAccountId })
      }

      // Create interest configuration if enabled
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
  }, [formData, condominiumId, managementCompanyId, createConcept, createAssignment, linkBankAccount, createInterestConfig, queryClient, router, toast, t])

  const wizardSteps: IStepItem<(typeof STEPS)[number]>[] = [
    { key: 'basicInfo', title: t(`${w}.steps.basicInfo`) },
    { key: 'chargeConfig', title: t(`${w}.steps.chargeConfig`) },
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
          <AssignmentsStep
            formData={formData}
            onUpdate={updateFormData}
            buildings={buildings}
            showErrors={showErrors}
            currencies={currencies}
            condominiumId={condominiumId}
            managementCompanyId={managementCompanyId}
          />
        )
      case 3:
        return (
          <BankAccountsStep
            formData={formData}
            onUpdate={updateFormData}
            managementCompanyId={managementCompanyId}
            currencies={currencies}
            showErrors={showErrors}
          />
        )
      case 4:
        return (
          <ReviewStep
            formData={formData}
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
    <div className="flex flex-col gap-6">
      {/* Stepper */}
      <Stepper
        steps={wizardSteps}
        currentStep={STEPS[currentStep]!}
        color="success"
        onStepChange={(stepKey) => {
          const stepIndex = STEPS.indexOf(stepKey)
          if (stepIndex >= 0 && stepIndex <= currentStep) {
            setShowErrors(false)
            setCurrentStep(stepIndex)
          }
        }}
      />

      {/* Step Content */}
      <Card>
        <CardBody className="p-6">
          {renderStepContent()}
        </CardBody>
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
    </div>
  )
}
