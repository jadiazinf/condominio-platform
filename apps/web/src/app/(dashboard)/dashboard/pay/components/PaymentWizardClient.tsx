'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useValidateQuotaSelection,
  useInitiatePayment,
  type IValidateSelectionResponse,
  type IPayableQuotaGroup,
  type IPayableBankAccount,
  type IInitiatePaymentResponse,
} from '@packages/http-client'

import { SelectQuotasStep } from './steps/SelectQuotasStep'
import { PaymentMethodStep } from './steps/PaymentMethodStep'
import { PaymentDetailsStep } from './steps/PaymentDetailsStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { ResultStep } from './steps/ResultStep'

import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUnitOption {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumId: string
  condominiumName: string
}

export type TPayMethod = 'c2p' | 'vpos' | 'transfer' | 'mobile_payment' | 'cash' | 'other'

export interface IPaymentWizardState {
  // Step 1 - Quota selection
  unitId: string
  selectedQuotaIds: string[]
  amounts: Record<string, string>
  quotaGroups: IPayableQuotaGroup[]
  validationResult: IValidateSelectionResponse | null

  // Step 2 - Payment method
  bankAccountId: string
  selectedBankAccount: IPayableBankAccount | null
  method: TPayMethod | ''
  isBncAccount: boolean

  // Step 3 - Payment details
  // C2P
  c2pPhoneCountryCode: string
  c2pPhoneNumber: string
  c2pBankCode: string
  c2pDocumentType: string
  c2pDocumentNumber: string
  c2pToken: string
  c2pOtpRequested: boolean

  // VPOS
  vposCardNumber: string
  vposCardType: number
  vposExpiry: string
  vposCvv: string
  vposHolderName: string
  vposHolderIdType: string
  vposHolderIdNumber: string
  vposAccountType: number

  // Manual
  manualPaymentDate: string
  manualReceiptNumber: string
  manualReceiptUrl: string
  manualNotes: string

  // Manual - mobile_payment sender info
  manualSenderPhoneCountryCode: string
  manualSenderPhoneNumber: string
  manualSenderBankCode: string
  manualSenderDocumentType: string
  manualSenderDocumentNumber: string

  // Step 5 - Result
  paymentResult: IInitiatePaymentResponse | null
  paymentError: string | null
}

const INITIAL_STATE: IPaymentWizardState = {
  unitId: '',
  selectedQuotaIds: [],
  amounts: {},
  quotaGroups: [],
  validationResult: null,
  bankAccountId: '',
  selectedBankAccount: null,
  method: '',
  isBncAccount: false,
  c2pPhoneCountryCode: '+58',
  c2pPhoneNumber: '',
  c2pBankCode: '',
  c2pDocumentType: 'V',
  c2pDocumentNumber: '',
  c2pToken: '',
  c2pOtpRequested: false,
  vposCardNumber: '',
  vposCardType: 2, // VISA default
  vposExpiry: '',
  vposCvv: '',
  vposHolderName: '',
  vposHolderIdType: 'V',
  vposHolderIdNumber: '',
  vposAccountType: 1, // Principal
  manualPaymentDate: new Date().toISOString().split('T')[0]!,
  manualReceiptNumber: '',
  manualReceiptUrl: '',
  manualNotes: '',
  manualSenderPhoneCountryCode: '+58',
  manualSenderPhoneNumber: '',
  manualSenderBankCode: '',
  manualSenderDocumentType: 'V',
  manualSenderDocumentNumber: '',
  paymentResult: null,
  paymentError: null,
}

const STEPS = ['selectQuotas', 'paymentMethod', 'paymentDetails', 'confirmation', 'result'] as const

type TStepKey = (typeof STEPS)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentWizardClientProps {
  unitOptions: IUnitOption[]
  userId: string
}

export function PaymentWizardClient({ unitOptions, userId }: PaymentWizardClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const searchParams = useSearchParams()
  const p = 'resident.pay'

  // Pre-fill from query params (from MyQuotasClient "Pagar seleccionadas")
  const preselectedQuotaIds = searchParams.get('quotaIds')?.split(',').filter(Boolean) ?? []
  const preselectedUnitId = searchParams.get('unitId') ?? ''

  const [currentStep, setCurrentStep] = useState(0)
  const [state, setState] = useState<IPaymentWizardState>(() => ({
    ...INITIAL_STATE,
    unitId: preselectedUnitId || (unitOptions.length === 1 ? unitOptions[0]!.unitId : ''),
    selectedQuotaIds: preselectedQuotaIds,
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateState = useCallback((updates: Partial<IPaymentWizardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Mutations
  const validateSelection = useValidateQuotaSelection()
  const initiatePayment = useInitiatePayment()

  // Auto-skip step 1 when quotas are pre-selected from URL params
  const autoSkipAttempted = useRef(false)

  useEffect(() => {
    if (
      autoSkipAttempted.current ||
      preselectedQuotaIds.length === 0 ||
      currentStep !== 0 ||
      !state.unitId ||
      state.selectedQuotaIds.length === 0 ||
      state.quotaGroups.length === 0
    ) {
      return
    }

    // Wait until amounts are populated (SelectQuotasStep's useEffect fills them)
    const hasAmounts = state.selectedQuotaIds.every(id => state.amounts[id])

    if (!hasAmounts) return

    autoSkipAttempted.current = true

    // Auto-validate and skip to step 2
    validateSelection
      .mutateAsync({
        unitId: state.unitId,
        quotaIds: state.selectedQuotaIds,
        amounts: state.amounts,
      })
      .then(result => {
        if (result.data?.data) {
          setState(prev => ({ ...prev, validationResult: result.data.data }))
          setCurrentStep(1)
        }
      })
      .catch(() => {
        // Validation failed — stay on step 1 so user can adjust
      })
  }, [
    preselectedQuotaIds.length,
    currentStep,
    state.unitId,
    state.selectedQuotaIds.length,
    state.quotaGroups.length,
  ])

  // Step navigation
  const handleNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [])

  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // Step 1 → 2: Validate selection
  const handleValidateAndProceed = useCallback(async () => {
    if (state.selectedQuotaIds.length === 0) return

    // Build effective amounts: use state.amounts if set, otherwise fall back to quota.balance
    // This mirrors the same fallback logic used by CurrencyInput display and total calculation
    const effectiveAmounts: Record<string, string> = {}

    for (const id of state.selectedQuotaIds) {
      if (state.amounts[id]) {
        effectiveAmounts[id] = state.amounts[id]
      } else {
        const quota = state.quotaGroups.flatMap(g => g.quotas).find(q => q.id === id)

        effectiveAmounts[id] = quota?.balance ?? '0'
      }
    }

    try {
      const result = await validateSelection.mutateAsync({
        unitId: state.unitId,
        quotaIds: state.selectedQuotaIds,
        amounts: effectiveAmounts,
      })

      if (result.data?.data) {
        updateState({ validationResult: result.data.data })
        handleNext()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(`${p}.errors.validationFailed`))
    }
  }, [
    state.unitId,
    state.selectedQuotaIds,
    state.amounts,
    state.quotaGroups,
    validateSelection,
    updateState,
    handleNext,
  ])

  // Step 4 → 5: Submit payment
  const handleSubmitPayment = useCallback(async () => {
    if (!state.validationResult || !state.method) return

    setIsSubmitting(true)
    try {
      const isManual = state.method !== 'c2p' && state.method !== 'vpos'
      const paymentMethod = isManual
        ? state.method
        : state.method === 'c2p'
          ? 'mobile_payment'
          : 'card'

      // Build effective amounts with fallback to quota.balance
      const effectiveAmounts: Record<string, string> = {}

      for (const id of state.selectedQuotaIds) {
        if (state.amounts[id]) {
          effectiveAmounts[id] = state.amounts[id]
        } else {
          const quota = state.quotaGroups.flatMap(g => g.quotas).find(q => q.id === id)

          effectiveAmounts[id] = quota?.balance ?? '0'
        }
      }

      const input: Record<string, unknown> = {
        unitId: state.unitId,
        quotaIds: state.selectedQuotaIds,
        amounts: effectiveAmounts,
        method: isManual ? 'manual' : state.method,
        paymentMethod,
        paymentDate: isManual ? state.manualPaymentDate : new Date().toISOString().split('T')[0],
        bankAccountId: state.bankAccountId,
      }

      if (isManual) {
        if (state.manualReceiptNumber) input.receiptNumber = state.manualReceiptNumber
        if (state.manualReceiptUrl) input.receiptUrl = state.manualReceiptUrl
        if (state.manualNotes) input.notes = state.manualNotes

        // Sender details for transfer and mobile_payment
        if (state.method === 'transfer' || state.method === 'mobile_payment') {
          input.senderBankCode = state.manualSenderBankCode
          input.senderDocument = `${state.manualSenderDocumentType}${state.manualSenderDocumentNumber}`
        }

        // Mobile payment also sends phone
        if (state.method === 'mobile_payment') {
          input.senderPhone = `${state.manualSenderPhoneCountryCode}${state.manualSenderPhoneNumber}`
        }
      }

      if (state.method === 'c2p') {
        input.c2pData = {
          debtorBankCode: state.c2pBankCode,
          debtorCellPhone: `${state.c2pPhoneCountryCode}${state.c2pPhoneNumber}`,
          debtorID: `${state.c2pDocumentType}${state.c2pDocumentNumber}`,
          token: state.c2pToken,
        }
      }

      if (state.method === 'vpos') {
        input.vposData = {
          cardType: state.vposCardType,
          cardNumber: state.vposCardNumber.replace(/\s/g, ''),
          expiration: parseInt(state.vposExpiry.replace('/', ''), 10),
          cvv: parseInt(state.vposCvv, 10),
          cardHolderName: state.vposHolderName,
          cardHolderID: parseInt(`${state.vposHolderIdNumber}`, 10),
          accountType: state.vposAccountType,
        }
      }

      const result = await initiatePayment.mutateAsync(input as any)

      if (result.data?.data) {
        updateState({
          paymentResult: result.data.data,
          paymentError: null,
        })
      }
      handleNext()
    } catch (error) {
      updateState({
        paymentResult: null,
        paymentError: error instanceof Error ? error.message : t(`${p}.errors.paymentFailed`),
      })
      handleNext() // Go to result step even on error
    } finally {
      setIsSubmitting(false)
    }
  }, [state, initiatePayment, updateState, handleNext, t])

  // Reset wizard
  const handleReset = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      unitId: unitOptions.length === 1 ? unitOptions[0]!.unitId : '',
    })
    setCurrentStep(0)
  }, [unitOptions])

  // Stepper config
  const wizardSteps: IStepItem<TStepKey>[] = useMemo(
    () => [
      { key: 'selectQuotas', title: t(`${p}.steps.selectQuotas`) },
      { key: 'paymentMethod', title: t(`${p}.steps.paymentMethod`) },
      { key: 'paymentDetails', title: t(`${p}.steps.paymentDetails`) },
      { key: 'confirmation', title: t(`${p}.steps.confirmation`) },
      { key: 'result', title: t(`${p}.steps.result`) },
    ],
    [t]
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <SelectQuotasStep
            preselectedQuotaIds={preselectedQuotaIds}
            state={state}
            unitOptions={unitOptions}
            onUpdate={updateState}
          />
        )
      case 1:
        return <PaymentMethodStep state={state} onUpdate={updateState} />
      case 2:
        return <PaymentDetailsStep state={state} onUpdate={updateState} />
      case 3:
        return <ConfirmationStep state={state} />
      case 4:
        return (
          <ResultStep state={state} onPayMore={handleReset} onTryAgain={() => setCurrentStep(2)} />
        )
      default:
        return null
    }
  }

  // Don't show stepper navigation on the result step
  const isResultStep = currentStep === 4

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper */}
      <Stepper
        hideLabelsOnMobile
        color="primary"
        currentStep={STEPS[currentStep]!}
        isClickable={!isResultStep}
        steps={wizardSteps}
        onStepChange={stepKey => {
          const stepIndex = STEPS.indexOf(stepKey)

          if (stepIndex >= 0 && stepIndex < currentStep) {
            setCurrentStep(stepIndex)
          }
        }}
      />

      {/* Step Content */}
      <Card>
        <CardBody className="p-4 sm:p-6">{renderStepContent()}</CardBody>
      </Card>

      {/* Navigation */}
      {!isResultStep && (
        <div className="flex justify-end gap-3">
          {currentStep > 0 && currentStep < 4 && (
            <Button variant="bordered" onPress={handleBack}>
              {t('common.back')}
            </Button>
          )}
          {currentStep === 0 && (
            <Button
              color="primary"
              isDisabled={state.selectedQuotaIds.length === 0}
              isLoading={validateSelection.isPending}
              onPress={handleValidateAndProceed}
            >
              {validateSelection.isPending
                ? t(`${p}.selectQuotas.validating`)
                : t(`${p}.selectQuotas.continue`)}
            </Button>
          )}
          {currentStep === 1 && (
            <Button
              color="primary"
              isDisabled={!state.bankAccountId || !state.method}
              onPress={handleNext}
            >
              {t('common.next')}
            </Button>
          )}
          {currentStep === 2 && (
            <Button color="primary" isDisabled={!canProceedFromDetails(state)} onPress={handleNext}>
              {t('common.next')}
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              color="primary"
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
              onPress={handleSubmitPayment}
            >
              {isSubmitting ? t(`${p}.confirm.processing`) : t(`${p}.confirm.confirmAndPay`)}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function canProceedFromDetails(state: IPaymentWizardState): boolean {
  const { method } = state

  if (method === 'c2p') {
    return !!(
      state.c2pPhoneNumber &&
      state.c2pBankCode &&
      state.c2pDocumentNumber &&
      state.c2pToken
    )
  }

  if (method === 'vpos') {
    return !!(
      state.vposCardNumber.replace(/\s/g, '').length >= 15 &&
      state.vposExpiry &&
      state.vposCvv.length >= 3 &&
      state.vposHolderName &&
      state.vposHolderIdNumber
    )
  }

  // Transfer needs date + receipt + sender bank + sender document
  if (method === 'transfer') {
    return !!(
      state.manualPaymentDate &&
      state.manualReceiptNumber &&
      state.manualSenderBankCode &&
      state.manualSenderDocumentNumber
    )
  }

  // Mobile payment needs date + receipt + sender info
  if (method === 'mobile_payment') {
    return !!(
      state.manualPaymentDate &&
      state.manualReceiptNumber &&
      state.manualSenderPhoneNumber &&
      state.manualSenderBankCode &&
      state.manualSenderDocumentNumber
    )
  }

  // Cash/other only need date
  return !!state.manualPaymentDate
}
