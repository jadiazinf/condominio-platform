'use client'

import type { TTaxIdType } from '@packages/domain'

import { useState, useMemo, useCallback } from 'react'
import { useQueryClient, HttpError, isApiValidationError } from '@packages/http-client'
import { condominiumServiceKeys, useCreateCondominiumService } from '@packages/http-client/hooks'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { PhoneInput } from '@/ui/components/phone-input'
import { TaxIdInput } from '@/ui/components/tax-id-input'
import { Switch } from '@/ui/components/switch'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IServiceFormData {
  // Step 1 - Basic Info
  name: string
  description: string
  providerType: string
  // Step 2 - Provider
  legalName: string
  taxIdType: TTaxIdType | null
  taxIdNumber: string
  email: string
  phoneCountryCode: string
  phone: string
  address: string
  // Step 3 - Fiscal
  chargesIva: boolean
  ivaRate: string
  subjectToIslarRetention: boolean
  islrRetentionRate: string
}

const INITIAL_FORM_DATA: IServiceFormData = {
  name: '',
  description: '',
  providerType: '',
  legalName: '',
  taxIdType: null,
  taxIdNumber: '',
  email: '',
  phoneCountryCode: '+58',
  phone: '',
  address: '',
  chargesIva: false,
  ivaRate: '16',
  subjectToIslarRetention: false,
  islrRetentionRate: '1',
}

const STEPS = ['basicInfo', 'provider', 'fiscal', 'review'] as const

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

  const { mutateAsync: createService } = useCreateCondominiumService(
    managementCompanyId,
    condominiumId
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
        return !!(formData.name && formData.providerType)
      case 1: // Provider (optional fields)
        return true
      case 2: // Fiscal (optional fields)
        return true
      case 3: // Review
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
        legalName: formData.legalName || undefined,
        taxIdType: formData.taxIdType || undefined,
        taxIdNumber: formData.taxIdNumber || undefined,
        email: formData.email || undefined,
        phoneCountryCode: formData.phoneCountryCode || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        chargesIva: formData.chargesIva,
        ivaRate: formData.chargesIva ? Number(formData.ivaRate) / 100 : 0.16,
        subjectToIslarRetention: formData.subjectToIslarRetention,
        islrRetentionRate: formData.subjectToIslarRetention
          ? Number(formData.islrRetentionRate) / 100
          : 0.01,
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
    { key: 'fiscal', title: 'Fiscal' },
    { key: 'review', title: t(`${w}.steps.review`) },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-5">
            <Typography color="muted" variant="body2">
              {t(`${w}.basicInfo.description`)}
            </Typography>

            <Input
              isRequired
              errorMessage={
                showErrors && !formData.name ? t(`${w}.basicInfo.errors.nameRequired`) : undefined
              }
              isInvalid={showErrors && !formData.name}
              label={t(`${w}.basicInfo.name`)}
              placeholder={t(`${w}.basicInfo.namePlaceholder`)}
              value={formData.name}
              variant="bordered"
              onValueChange={v => updateFormData({ name: v })}
            />

            <Textarea
              label={t(`${w}.basicInfo.descriptionLabel`)}
              maxRows={4}
              minRows={2}
              placeholder={t(`${w}.basicInfo.descriptionPlaceholder`)}
              value={formData.description}
              variant="bordered"
              onValueChange={v => updateFormData({ description: v })}
            />

            <Select
              isRequired
              errorMessage={
                showErrors && !formData.providerType
                  ? t(`${w}.basicInfo.errors.providerTypeRequired`)
                  : undefined
              }
              isInvalid={showErrors && !formData.providerType}
              items={providerTypeItems}
              label={t(`${w}.basicInfo.providerType`)}
              placeholder={t(`${w}.basicInfo.providerTypePlaceholder`)}
              value={formData.providerType}
              variant="bordered"
              onChange={key => key && updateFormData({ providerType: key })}
            />
          </div>
        )

      case 1:
        return (
          <div className="flex flex-col gap-5">
            <Typography color="muted" variant="body2">
              {t(`${w}.provider.description`)}
            </Typography>

            <Input
              label={t(`${w}.provider.legalName`)}
              placeholder={t(`${w}.provider.legalNamePlaceholder`)}
              value={formData.legalName}
              variant="bordered"
              onValueChange={v => updateFormData({ legalName: v })}
            />

            <TaxIdInput
              label={t(`${w}.provider.taxId`)}
              taxIdNumber={formData.taxIdNumber}
              taxIdType={formData.taxIdType}
              onTaxIdNumberChange={v => updateFormData({ taxIdNumber: v })}
              onTaxIdTypeChange={type => updateFormData({ taxIdType: type })}
            />

            <Input
              label={t(`${w}.provider.email`)}
              placeholder={t(`${w}.provider.emailPlaceholder`)}
              type="email"
              value={formData.email}
              variant="bordered"
              onValueChange={v => updateFormData({ email: v })}
            />

            <PhoneInput
              countryCode={formData.phoneCountryCode}
              label={t(`${w}.provider.phone`)}
              phoneNumber={formData.phone}
              onCountryCodeChange={code => updateFormData({ phoneCountryCode: code ?? '+58' })}
              onPhoneNumberChange={v => updateFormData({ phone: v })}
            />

            <Input
              label={t(`${w}.provider.address`)}
              placeholder={t(`${w}.provider.addressPlaceholder`)}
              value={formData.address}
              variant="bordered"
              onValueChange={v => updateFormData({ address: v })}
            />
          </div>
        )

      case 2:
        return (
          <div className="flex flex-col gap-5">
            <Typography color="muted" variant="body2">
              Configura los impuestos aplicables a este proveedor. Todos los campos son opcionales.
            </Typography>

            {/* IVA */}
            <div className="rounded-lg border border-default-200 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Typography className="font-medium" variant="body2">
                    ¿El proveedor cobra IVA?
                  </Typography>
                  <Typography color="muted" variant="caption">
                    Aplica cuando el proveedor emite facturas con IVA
                  </Typography>
                </div>
                <Switch
                  color="primary"
                  isSelected={formData.chargesIva}
                  onValueChange={v => updateFormData({ chargesIva: v })}
                />
              </div>

              {formData.chargesIva && (
                <Input
                  description="Tasa general en Venezuela: 16%"
                  endContent={<span className="text-default-400 text-sm">%</span>}
                  label="Alícuota IVA"
                  placeholder="16"
                  type="number"
                  value={formData.ivaRate}
                  variant="bordered"
                  onValueChange={v => updateFormData({ ivaRate: v })}
                />
              )}
            </div>

            {/* ISLR Retención */}
            <div className="rounded-lg border border-default-200 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Typography className="font-medium" variant="body2">
                    ¿Aplica retención de ISLR?
                  </Typography>
                  <Typography color="muted" variant="caption">
                    Para contratistas y profesionales según Decreto 1808
                  </Typography>
                </div>
                <Switch
                  color="primary"
                  isSelected={formData.subjectToIslarRetention}
                  onValueChange={v => updateFormData({ subjectToIslarRetention: v })}
                />
              </div>

              {formData.subjectToIslarRetention && (
                <Input
                  description="Contratistas de servicios: 1%. Profesionales: según tabla ISLR"
                  endContent={<span className="text-default-400 text-sm">%</span>}
                  label="Porcentaje de retención ISLR"
                  placeholder="1"
                  type="number"
                  value={formData.islrRetentionRate}
                  variant="bordered"
                  onValueChange={v => updateFormData({ islrRetentionRate: v })}
                />
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="flex flex-col gap-5">
            <Typography color="muted" variant="body2">
              {t(`${w}.review.description`)}
            </Typography>

            {/* Basic Info Card */}
            <div className="rounded-lg border border-default-200 p-4 space-y-2">
              <Typography className="font-semibold" variant="body2">
                {t(`${w}.review.basicInfo`)}
              </Typography>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-default-500">{t(`${w}.review.name`)}</span>
                <span className="font-medium">{formData.name}</span>

                <span className="text-default-500">{t(`${w}.review.providerType`)}</span>
                <span>
                  {t(`admin.condominiums.detail.services.providerTypes.${formData.providerType}`)}
                </span>

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
                <Typography className="font-semibold" variant="body2">
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

            {/* Fiscal Config Card (only if any tax config is set) */}
            {(formData.chargesIva || formData.subjectToIslarRetention) && (
              <div className="rounded-lg border border-default-200 p-4 space-y-2">
                <Typography className="font-semibold" variant="body2">
                  Configuración Fiscal
                </Typography>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {formData.chargesIva && (
                    <>
                      <span className="text-default-500">IVA</span>
                      <span>{formData.ivaRate}%</span>
                    </>
                  )}
                  {formData.subjectToIslarRetention && (
                    <>
                      <span className="text-default-500">Retención ISLR</span>
                      <span>{formData.islrRetentionRate}%</span>
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
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <Typography variant="h4">{t(`${w}.title`)}</Typography>
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
