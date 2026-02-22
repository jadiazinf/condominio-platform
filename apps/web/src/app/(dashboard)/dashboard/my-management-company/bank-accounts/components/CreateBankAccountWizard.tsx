'use client'

import { useState, useCallback } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { useCreateBankAccount, bankAccountKeys, useQueryClient, HttpError, isApiValidationError } from '@packages/http-client'

import { SelectCategoryStep } from './steps/SelectCategoryStep'
import { NationalDetailsStep } from './steps/NationalDetailsStep'
import { InternationalDetailsStep } from './steps/InternationalDetailsStep'
import { CondominiumAssignmentStep } from './steps/CondominiumAssignmentStep'
import { ReviewStep } from './steps/ReviewStep'

export type TWizardCategory = 'national' | 'international' | null
export type TInternationalSubType = 'wire_transfer' | 'zelle' | 'ach' | 'paypal_wise' | 'crypto'

export interface IWizardFormData {
  // Step 1
  accountCategory: TWizardCategory
  // Step 2 - National
  bankId?: string
  bankName: string
  bankCode?: string
  accountNumber?: string
  accountType?: string
  accountHolderName: string
  identityDocType?: string
  identityDocNumber?: string
  phoneCountryCode?: string
  phoneNumber?: string
  currency: string
  currencyId?: string
  acceptedPaymentMethods: string[]
  // Step 2 - International
  internationalSubType?: TInternationalSubType
  swiftCode?: string
  iban?: string
  routingNumber?: string
  intlAccountNumber?: string
  bankAddress?: string
  bankCountry?: string
  beneficiaryAddress?: string
  zelleEmail?: string
  zellePhone?: string
  intlAccountType?: string
  accountHolderType?: string
  paypalEmail?: string
  wiseEmail?: string
  walletAddress?: string
  cryptoNetwork?: string
  cryptoCurrency?: string
  // Step 3
  appliesToAllCondominiums: boolean
  condominiumIds: string[]
  // Step 4
  displayName: string
  notes?: string
}

const INITIAL_FORM_DATA: IWizardFormData = {
  accountCategory: null,
  bankName: '',
  accountHolderName: '',
  identityDocType: 'J',
  currency: 'VES',
  acceptedPaymentMethods: [],
  appliesToAllCondominiums: true,
  condominiumIds: [],
  displayName: '',
}

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const

interface CreateBankAccountWizardProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
}

export function CreateBankAccountWizard({
  isOpen,
  onClose,
  managementCompanyId,
}: CreateBankAccountWizardProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<IWizardFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const { mutateAsync: createBankAccount } = useCreateBankAccount(managementCompanyId)

  const updateFormData = useCallback((updates: Partial<IWizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const scrollToFirstError = useCallback(() => {
    setTimeout(() => {
      const body = document.querySelector('[data-slot="body"]')
      const firstInvalid = body?.querySelector('[data-invalid="true"], .text-danger')
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
  }, [])

  const handleBack = useCallback(() => {
    setShowErrors(false)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const handleCategorySelect = useCallback(
    (category: 'national' | 'international') => {
      if (category !== formData.accountCategory) {
        updateFormData({
          accountCategory: category,
          currency: category === 'national' ? 'VES' : 'USD',
          currencyId: undefined,
          acceptedPaymentMethods: [],
          bankName: '',
          bankId: undefined,
          bankCode: undefined,
        })
      }
      setShowErrors(false)
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    },
    [formData.accountCategory, updateFormData]
  )

  const handleClose = useCallback(() => {
    setCurrentStep(0)
    setFormData(INITIAL_FORM_DATA)
    setShowErrors(false)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const accountDetails: Record<string, unknown> = {}

      if (formData.accountCategory === 'national') {
        accountDetails.accountNumber = `${formData.bankCode}${formData.accountNumber}`
        accountDetails.bankCode = formData.bankCode
        accountDetails.accountType = formData.accountType
        accountDetails.identityDocType = formData.identityDocType
        accountDetails.identityDocNumber = formData.identityDocNumber
        if (formData.phoneNumber) {
          const code = formData.phoneCountryCode || '+58'
          accountDetails.phoneNumber = `${code}${formData.phoneNumber}`
        }
      } else {
        if (formData.swiftCode) accountDetails.swiftCode = formData.swiftCode
        if (formData.iban) accountDetails.iban = formData.iban
        if (formData.routingNumber) accountDetails.routingNumber = formData.routingNumber
        if (formData.intlAccountNumber) accountDetails.accountNumber = formData.intlAccountNumber
        if (formData.bankAddress) accountDetails.bankAddress = formData.bankAddress
        if (formData.bankCountry) accountDetails.bankCountry = formData.bankCountry
        if (formData.beneficiaryAddress) accountDetails.beneficiaryAddress = formData.beneficiaryAddress
        if (formData.zelleEmail) accountDetails.zelleEmail = formData.zelleEmail
        if (formData.zellePhone) accountDetails.zellePhone = formData.zellePhone
        if (formData.intlAccountType) accountDetails.accountType = formData.intlAccountType
        if (formData.accountHolderType) accountDetails.accountHolderType = formData.accountHolderType
        if (formData.paypalEmail) accountDetails.paypalEmail = formData.paypalEmail
        if (formData.wiseEmail) accountDetails.wiseEmail = formData.wiseEmail
        if (formData.walletAddress) accountDetails.walletAddress = formData.walletAddress
        if (formData.cryptoNetwork) accountDetails.cryptoNetwork = formData.cryptoNetwork
        if (formData.cryptoCurrency) accountDetails.cryptoCurrency = formData.cryptoCurrency
      }

      await createBankAccount({
        bankId: formData.bankId,
        accountCategory: formData.accountCategory!,
        displayName: formData.displayName,
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        currency: formData.currency,
        currencyId: formData.currencyId,
        accountDetails,
        acceptedPaymentMethods: formData.acceptedPaymentMethods as any,
        appliesToAllCondominiums: formData.appliesToAllCondominiums,
        condominiumIds: formData.appliesToAllCondominiums ? undefined : formData.condominiumIds,
        notes: formData.notes,
      })

      await queryClient.invalidateQueries({ queryKey: bankAccountKeys.all })
      toast.success(t('admin.company.myCompany.bankAccounts.wizard.success'))
      handleClose()
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        const details = error.details
        if (isApiValidationError(details)) {
          const fieldMessages = details.error.fields
            .map(f => f.messages.join(', '))
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
  }, [formData, createBankAccount, queryClient, handleClose])

  const wizardSteps: IStepItem<(typeof STEPS)[number]>[] = [
    { key: 'step1', title: t('admin.company.myCompany.bankAccounts.wizard.step1') },
    { key: 'step2', title: t('admin.company.myCompany.bankAccounts.wizard.step2') },
    { key: 'step3', title: t('admin.company.myCompany.bankAccounts.wizard.step3') },
    { key: 'step4', title: t('admin.company.myCompany.bankAccounts.wizard.step4') },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <SelectCategoryStep onSelect={handleCategorySelect} />
      case 1:
        return formData.accountCategory === 'national' ? (
          <NationalDetailsStep
            formData={formData}
            onUpdate={updateFormData}
            managementCompanyId={managementCompanyId}
            showErrors={showErrors}
          />
        ) : (
          <InternationalDetailsStep formData={formData} onUpdate={updateFormData} showErrors={showErrors} />
        )
      case 2:
        return (
          <CondominiumAssignmentStep
            formData={formData}
            onUpdate={updateFormData}
            managementCompanyId={managementCompanyId}
          />
        )
      case 3:
        return <ReviewStep formData={formData} onUpdate={updateFormData} />
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.accountCategory !== null
      case 1:
        if (formData.accountCategory === 'national') {
          const isPagoMovil = formData.acceptedPaymentMethods.includes('pago_movil')
          const phoneValid = !isPagoMovil || !!formData.phoneNumber
          const accountNumberValid = formData.accountNumber?.length === 16 && !!formData.bankCode
          return !!(
            formData.bankName &&
            accountNumberValid &&
            formData.accountType &&
            formData.accountHolderName &&
            formData.identityDocType &&
            formData.identityDocNumber &&
            formData.acceptedPaymentMethods.length > 0 &&
            phoneValid
          )
        }
        // International: validate each selected payment method
        const methods = formData.acceptedPaymentMethods
        if (methods.length === 0 || !formData.accountHolderName || !formData.bankName) return false

        const hasWire = methods.includes('wire_transfer')
        const hasZelle = methods.includes('zelle')
        const hasAch = methods.includes('ach')
        const hasPaypal = methods.includes('paypal')
        const hasWise = methods.includes('wise')
        const hasCrypto = methods.includes('crypto')

        if ((hasWire || hasAch) && !formData.intlAccountNumber) return false
        if (hasWire && !formData.swiftCode) return false
        if (hasZelle && !(formData.zelleEmail || formData.zellePhone)) return false
        if (hasAch && (formData.routingNumber?.length !== 9 || !formData.accountHolderType || !formData.intlAccountType)) return false
        if (hasPaypal && !formData.paypalEmail) return false
        if (hasWise && !formData.wiseEmail) return false
        if (hasCrypto && !(formData.walletAddress && formData.cryptoNetwork && formData.cryptoCurrency)) return false

        return true
      case 2:
        return formData.appliesToAllCondominiums || formData.condominiumIds.length > 0
      case 3:
        return !!formData.displayName
      default:
        return false
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <Typography variant="h4">
            {t('admin.company.myCompany.bankAccounts.wizard.title')}
          </Typography>
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
              currentStep > 0 && (
                <Button
                  color="success"
                  onPress={() => {
                    if (canProceed()) {
                      setShowErrors(false)
                      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
                    } else {
                      setShowErrors(true)
                      scrollToFirstError()
                    }
                  }}
                >
                  {t('common.next')}
                </Button>
              )
            ) : (
              <Button
                color="success"
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                onPress={() => {
                  if (canProceed()) {
                    handleSubmit()
                  } else {
                    setShowErrors(true)
                    scrollToFirstError()
                  }
                }}
              >
                {isSubmitting
                  ? t('admin.company.myCompany.bankAccounts.wizard.creating')
                  : t('admin.company.myCompany.bankAccounts.wizard.create')}
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
