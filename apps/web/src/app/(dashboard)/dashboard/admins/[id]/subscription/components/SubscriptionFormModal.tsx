'use client'

import { FormProvider } from 'react-hook-form'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Progress } from '@/ui/components/progress'
import { useTranslation } from '@/contexts'

import { useSubscriptionForm } from '../hooks'
import { Stepper } from '@/ui/components/stepper'
import { BasicStepForm, LimitsStepForm, PricingStepForm, ConfirmationStep } from './steps'
import { ReplaceSubscriptionModal } from './ReplaceSubscriptionModal'

interface SubscriptionFormModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  createdBy: string
}

export function SubscriptionFormModal({
  isOpen,
  onClose,
  companyId,
  createdBy,
}: SubscriptionFormModalProps) {
  const { t } = useTranslation()

  const {
    form,
    companyId: formCompanyId,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    isSubmitting,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    handleSubmit,
    shouldShowError,
    translateError,
    getValues,
    steps,
    // Replacement modal
    showReplaceModal,
    activeSubscription,
    handleConfirmReplacement,
    handleCloseReplaceModal,
    isReplacing,
  } = useSubscriptionForm({
    companyId,
    createdBy,
    onClose,
    isOpen,
  })

  const progressValue = ((currentStepIndex + 1) / totalSteps) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <BasicStepForm
            shouldShowError={shouldShowError}
            translateError={translateError}
          />
        )
      case 'limits':
        return (
          <LimitsStepForm
            shouldShowError={shouldShowError}
            translateError={translateError}
          />
        )
      case 'pricing':
        return (
          <PricingStepForm
            companyId={formCompanyId}
            shouldShowError={shouldShowError}
            translateError={translateError}
          />
        )
      case 'confirmation':
        return <ConfirmationStep data={getValues()} />
      default:
        return null
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalContent className="max-h-[95vh] min-h-[80vh]">
          <FormProvider {...form}>
            <ModalHeader>
              {t('superadmin.companies.subscription.form.createTitle')}
            </ModalHeader>

            <ModalBody className="space-y-6">
              {/* Progress and Step Indicator */}
              <div className="space-y-4">
                <Progress
                  aria-label="Form progress"
                  classNames={{
                    indicator: 'bg-success',
                  }}
                  value={progressValue}
                />
                <Stepper
                  currentStep={currentStep}
                  steps={steps}
                  color="success"
                  onStepChange={goToStep}
                />
              </div>

              {/* Step Content */}
              <div className="min-h-[500px]">{renderStepContent()}</div>
            </ModalBody>

            <ModalFooter className="border-t border-default-200">
              <div className="flex w-full justify-end gap-3">
                {!isFirstStep && (
                  <Button
                    variant="bordered"
                    onPress={goToPreviousStep}
                    isDisabled={isSubmitting}
                  >
                    {t('common.previous')}
                  </Button>
                )}

                {isLastStep ? (
                  <Button
                    color="success"
                    onPress={handleSubmit}
                    isLoading={isSubmitting}
                  >
                    {t('superadmin.companies.subscription.form.submit')}
                  </Button>
                ) : (
                  <Button color="success" onPress={goToNextStep}>
                    {t('common.next')}
                  </Button>
                )}
              </div>
            </ModalFooter>
          </FormProvider>
        </ModalContent>
      </Modal>

      {/* Replace Subscription Modal */}
      {activeSubscription && (
        <ReplaceSubscriptionModal
          isOpen={showReplaceModal}
          onClose={handleCloseReplaceModal}
          onConfirm={handleConfirmReplacement}
          currentSubscription={activeSubscription}
          isProcessing={isReplacing}
        />
      )}
    </>
  )
}
