'use client'

import { FormProvider } from 'react-hook-form'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Progress } from '@/ui/components/progress'
import { Stepper } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'

import { useCondominiumForm } from '../hooks/useCondominiumForm'
import { BasicStepForm } from './steps/BasicStepForm'
import { LocationStepForm } from './steps/LocationStepForm'
import { ContactStepForm } from './steps/ContactStepForm'
import { ConfirmationStep } from './steps/ConfirmationStep'

interface CreateCondominiumFormProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
  createdBy: string
}

export function CreateCondominiumForm({
  isOpen,
  onClose,
  managementCompanyId,
  createdBy,
}: CreateCondominiumFormProps) {
  const { t } = useTranslation()

  const {
    form,
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
    steps,
  } = useCondominiumForm({
    managementCompanyId,
    createdBy,
    onClose,
    onSuccess: () => {
      // Additional success callback if needed
    },
  })

  const progressValue = ((currentStepIndex + 1) / totalSteps) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return <BasicStepForm />
      case 'location':
        return <LocationStepForm />
      case 'contact':
        return <ContactStepForm />
      case 'confirmation':
        return <ConfirmationStep onGoToStep={goToStep} />
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent className="max-h-[95vh] min-h-[80vh]">
        <FormProvider {...form}>
          <ModalHeader>{t('condominiums.form.title')}</ModalHeader>

          <ModalBody className="space-y-6">
            {/* Progress and Step Indicator */}
            <div className="space-y-4">
              <Progress
                aria-label="Form progress"
                classNames={{
                  indicator: 'bg-primary',
                }}
                value={progressValue}
              />
              <Stepper
                currentStep={currentStep}
                steps={steps}
                onStepChange={goToStep}
              />
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">{renderStepContent()}</div>
          </ModalBody>

          <ModalFooter className="border-t border-default-200">
            <div className="flex w-full justify-end gap-3">
              {!isFirstStep && (
                <Button
                  variant="bordered"
                  onPress={goToPreviousStep}
                  isDisabled={isSubmitting}
                >
                  {t('condominiums.actions.previous')}
                </Button>
              )}

              {isLastStep ? (
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                >
                  {t('condominiums.actions.submit')}
                </Button>
              ) : (
                <Button color="primary" onPress={goToNextStep}>
                  {t('condominiums.actions.next')}
                </Button>
              )}
            </div>
          </ModalFooter>
        </FormProvider>
      </ModalContent>
    </Modal>
  )
}
