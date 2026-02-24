'use client'

import { useState, useMemo, useCallback } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Calculator } from 'lucide-react'
import { Input, CurrencyInput } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { PhoneInput } from '@/ui/components/phone-input'
import { TaxIdInput } from '@/ui/components/tax-id-input'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  useActiveCurrencies,
  useQueryClient,
  HttpError,
  isApiValidationError,
} from '@packages/http-client'
import type { TTaxIdType } from '@packages/domain'
import { condominiumServiceKeys, useCreateCondominiumService } from '@packages/http-client/hooks'
import { CurrencyCalculatorModal } from '../../payment-concepts/components/wizard/steps/CurrencyCalculatorModal'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IServiceFormData {
  // Step 1 - Basic Info
  name: string
  description: string
  providerType: string
  currencyId: string
  defaultAmount: string
  // Step 2 - Provider
  legalName: string
  taxIdType: TTaxIdType | null
  taxIdNumber: string
  email: string
  phoneCountryCode: string
  phone: string
  address: string
}

const INITIAL_FORM_DATA: IServiceFormData = {
  name: '',
  description: '',
  providerType: '',
  currencyId: '',
  defaultAmount: '',
  legalName: '',
  taxIdType: null,
  taxIdNumber: '',
  email: '',
  phoneCountryCode: '+58',
  phone: '',
  address: '',
}

const STEPS = ['basicInfo', 'provider', 'review'] as const

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CreateServiceModalProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  managementCompanyId: string
  onCreated?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreateServiceModal({
  isOpen,
  onClose,
  condominiumId,
  managementCompanyId,
  onCreated,
}: CreateServiceModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const w = 'admin.condominiums.detail.services.wizard'

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<IServiceFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const calculatorModal = useDisclosure()

  const { mutateAsync: createService } = useCreateCondominiumService(managementCompanyId, condominiumId)

  // Fetch currencies
  const { data: currenciesData } = useActiveCurrencies({ enabled: isOpen })
  const currencies = useMemo(() => currenciesData?.data ?? [], [currenciesData])

  const currencyItems: ISelectItem[] = useMemo(
    () => currencies
      .map(c => ({ key: c.id, label: `${c.code}${c.name ? ` - ${c.name}` : ''}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [currencies]
  )

  const providerTypeItems: ISelectItem[] = useMemo(
    () => [
      {
        key: 'individual',
        label: t('admin.condominiums.detail.services.providerTypes.individual'),
      },
      { key: 'company', label: t('admin.condominiums.detail.services.providerTypes.company') },
      {
        key: 'cooperative',
        label: t('admin.condominiums.detail.services.providerTypes.cooperative'),
      },
      {
        key: 'government',
        label: t('admin.condominiums.detail.services.providerTypes.government'),
      },
      { key: 'internal', label: t('admin.condominiums.detail.services.providerTypes.internal') },
    ],
    [t]
  )

  const updateFormData = useCallback((updates: Partial<IServiceFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleClose = useCallback(() => {
    setCurrentStep(0)
    setFormData(INITIAL_FORM_DATA)
    setShowErrors(false)
    onClose()
  }, [onClose])

  const handleBack = useCallback(() => {
    setShowErrors(false)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(formData.name && formData.providerType && formData.currencyId)
      case 1: // Provider (optional fields)
        return true
      case 2: // Review
        return true
      default:
        return false
    }
  }

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await createService({
        condominiumId,
        name: formData.name,
        description: formData.description || undefined,
        providerType: formData.providerType as any,
        currencyId: formData.currencyId,
        defaultAmount: formData.defaultAmount ? Number(formData.defaultAmount) : undefined,
        legalName: formData.legalName || undefined,
        taxIdType: formData.taxIdType || undefined,
        taxIdNumber: formData.taxIdNumber || undefined,
        email: formData.email || undefined,
        phoneCountryCode: formData.phoneCountryCode || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      } as any)

      await queryClient.invalidateQueries({ queryKey: condominiumServiceKeys.all })
      toast.success(t(`${w}.success`))
      handleClose()
      onCreated?.()
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
  }, [formData, condominiumId, createService, queryClient, handleClose, onCreated, toast, t])

  const wizardSteps: IStepItem<(typeof STEPS)[number]>[] = [
    { key: 'basicInfo', title: t(`${w}.steps.basicInfo`) },
    { key: 'provider', title: t(`${w}.steps.provider`) },
    { key: 'review', title: t(`${w}.steps.review`) },
  ]

  // Currency symbol for amount input
  const currencySymbol = useMemo(() => {
    if (!formData.currencyId) return ''
    const cur = currencies.find(c => c.id === formData.currencyId)
    return cur?.symbol || cur?.code || ''
  }, [formData.currencyId, currencies])

  const getCurrencyCode = () => currencies.find(c => c.id === formData.currencyId)?.code || ''

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-5">
            <Typography variant="body2" color="muted">
              {t(`${w}.basicInfo.description`)}
            </Typography>

            <Input
              label={t(`${w}.basicInfo.name`)}
              placeholder={t(`${w}.basicInfo.namePlaceholder`)}
              value={formData.name}
              onValueChange={v => updateFormData({ name: v })}
              variant="bordered"
              isRequired
              isInvalid={showErrors && !formData.name}
              errorMessage={
                showErrors && !formData.name ? t(`${w}.basicInfo.errors.nameRequired`) : undefined
              }
            />

            <Textarea
              label={t(`${w}.basicInfo.descriptionLabel`)}
              placeholder={t(`${w}.basicInfo.descriptionPlaceholder`)}
              value={formData.description}
              onValueChange={v => updateFormData({ description: v })}
              variant="bordered"
              minRows={2}
              maxRows={4}
            />

            <Select
              label={t(`${w}.basicInfo.providerType`)}
              placeholder={t(`${w}.basicInfo.providerTypePlaceholder`)}
              items={providerTypeItems}
              value={formData.providerType}
              onChange={key => key && updateFormData({ providerType: key })}
              variant="bordered"
              isRequired
              isInvalid={showErrors && !formData.providerType}
              errorMessage={
                showErrors && !formData.providerType
                  ? t(`${w}.basicInfo.errors.providerTypeRequired`)
                  : undefined
              }
            />

            <Select
              label={t(`${w}.basicInfo.currency`)}
              placeholder={t(`${w}.basicInfo.currencyPlaceholder`)}
              items={currencyItems}
              value={formData.currencyId}
              onChange={key => key && updateFormData({ currencyId: key })}
              variant="bordered"
              isRequired
              isInvalid={showErrors && !formData.currencyId}
              errorMessage={
                showErrors && !formData.currencyId
                  ? t(`${w}.basicInfo.errors.currencyRequired`)
                  : undefined
              }
            />

            <div>
              <div className="flex items-end gap-2">
                <CurrencyInput
                  label={t(`${w}.basicInfo.defaultAmount`)}
                  placeholder={t(`${w}.basicInfo.defaultAmountPlaceholder`)}
                  value={formData.defaultAmount}
                  onValueChange={v => updateFormData({ defaultAmount: v })}
                  currencySymbol={
                    currencySymbol ? (
                      <span className="text-default-400 text-sm">{currencySymbol}</span>
                    ) : undefined
                  }
                  showCurrencySymbol={!!currencySymbol}
                  variant="bordered"
                  className="flex-1"
                />
                {formData.currencyId && (
                  <Button
                    isIconOnly
                    variant="flat"
                    color="primary"
                    onPress={calculatorModal.onOpen}
                    className="mb-0.5"
                  >
                    <Calculator size={18} />
                  </Button>
                )}
              </div>
              <Typography variant="caption" color="muted" className="mt-1">
                {t(`${w}.basicInfo.defaultAmountHint`)}
              </Typography>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="flex flex-col gap-5">
            <Typography variant="body2" color="muted">
              {t(`${w}.provider.description`)}
            </Typography>

            <Input
              label={t(`${w}.provider.legalName`)}
              placeholder={t(`${w}.provider.legalNamePlaceholder`)}
              value={formData.legalName}
              onValueChange={v => updateFormData({ legalName: v })}
              variant="bordered"
            />

            <TaxIdInput
              label={t(`${w}.provider.taxId`)}
              taxIdType={formData.taxIdType}
              taxIdNumber={formData.taxIdNumber}
              onTaxIdTypeChange={type => updateFormData({ taxIdType: type })}
              onTaxIdNumberChange={v => updateFormData({ taxIdNumber: v })}
            />

            <Input
              label={t(`${w}.provider.email`)}
              placeholder={t(`${w}.provider.emailPlaceholder`)}
              value={formData.email}
              onValueChange={v => updateFormData({ email: v })}
              variant="bordered"
              type="email"
            />

            <PhoneInput
              label={t(`${w}.provider.phone`)}
              countryCode={formData.phoneCountryCode}
              phoneNumber={formData.phone}
              onCountryCodeChange={code => updateFormData({ phoneCountryCode: code ?? '+58' })}
              onPhoneNumberChange={v => updateFormData({ phone: v })}
            />

            <Input
              label={t(`${w}.provider.address`)}
              placeholder={t(`${w}.provider.addressPlaceholder`)}
              value={formData.address}
              onValueChange={v => updateFormData({ address: v })}
              variant="bordered"
            />
          </div>
        )

      case 2:
        return (
          <div className="flex flex-col gap-5">
            <Typography variant="body2" color="muted">
              {t(`${w}.review.description`)}
            </Typography>

            {/* Basic Info Card */}
            <div className="rounded-lg border border-default-200 p-4 space-y-2">
              <Typography variant="body2" className="font-semibold">
                {t(`${w}.review.basicInfo`)}
              </Typography>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-default-500">{t(`${w}.review.name`)}</span>
                <span className="font-medium">{formData.name}</span>

                <span className="text-default-500">{t(`${w}.review.providerType`)}</span>
                <span>
                  {t(`admin.condominiums.detail.services.providerTypes.${formData.providerType}`)}
                </span>

                <span className="text-default-500">{t(`${w}.review.currency`)}</span>
                <span>{getCurrencyCode()}</span>

                {formData.defaultAmount && (
                  <>
                    <span className="text-default-500">{t(`${w}.review.defaultAmount`)}</span>
                    <span className="font-mono">
                      {Number(formData.defaultAmount).toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </>
                )}

                {formData.description && (
                  <>
                    <span className="text-default-500 col-span-2 mt-1">{formData.description}</span>
                  </>
                )}
              </div>
            </div>

            {/* Provider Info Card (only if any data exists) */}
            {(formData.legalName ||
              formData.taxIdNumber ||
              formData.email ||
              formData.phone ||
              formData.address) && (
              <div className="rounded-lg border border-default-200 p-4 space-y-2">
                <Typography variant="body2" className="font-semibold">
                  {t(`${w}.review.providerInfo`)}
                </Typography>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {formData.legalName && (
                    <>
                      <span className="text-default-500">{t(`${w}.review.legalName`)}</span>
                      <span>{formData.legalName}</span>
                    </>
                  )}
                  {formData.taxIdType && formData.taxIdNumber && (
                    <>
                      <span className="text-default-500">{t(`${w}.review.taxId`)}</span>
                      <span>
                        {formData.taxIdType}-{formData.taxIdNumber}
                      </span>
                    </>
                  )}
                  {formData.email && (
                    <>
                      <span className="text-default-500">{t(`${w}.review.email`)}</span>
                      <span>{formData.email}</span>
                    </>
                  )}
                  {formData.phone && (
                    <>
                      <span className="text-default-500">{t(`${w}.review.phone`)}</span>
                      <span>
                        {formData.phoneCountryCode}
                        {formData.phone}
                      </span>
                    </>
                  )}
                  {formData.address && (
                    <>
                      <span className="text-default-500">{t(`${w}.review.address`)}</span>
                      <span>{formData.address}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
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

      {/* Currency Calculator Modal */}
      {formData.currencyId && (
        <CurrencyCalculatorModal
          isOpen={calculatorModal.isOpen}
          onClose={calculatorModal.onClose}
          onConfirm={(convertedAmount) => {
            updateFormData({ defaultAmount: convertedAmount })
            calculatorModal.onClose()
          }}
          targetCurrencyId={formData.currencyId}
          currencies={currencies}
        />
      )}
    </Modal>
  )
}
