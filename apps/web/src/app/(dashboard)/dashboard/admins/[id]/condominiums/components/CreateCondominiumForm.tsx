'use client'

import { FormProvider } from 'react-hook-form'

import { useCondominiumForm } from '../hooks/useCondominiumForm'

import { BasicStepForm } from './steps/BasicStepForm'
import { LocationStepForm } from './steps/LocationStepForm'
import { ContactStepForm } from './steps/ContactStepForm'
import { ConfirmationStep } from './steps/ConfirmationStep'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Progress } from '@/ui/components/progress'
import { Stepper } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'

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
    <Modal isOpen={isOpen} scrollBehavior="inside" size="4xl" onClose={onClose}>
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
              <Stepper currentStep={currentStep} steps={steps} onStepChange={goToStep} />
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">{renderStepContent()}</div>
          </ModalBody>

          <ModalFooter className="border-t border-default-200">
            <div className="flex w-full justify-end gap-3">
              {!isFirstStep && (
                <Button isDisabled={isSubmitting} variant="bordered" onPress={goToPreviousStep}>
                  {t('condominiums.actions.previous')}
                </Button>
              )}

              {isLastStep ? (
                <Button color="primary" isLoading={isSubmitting} onPress={handleSubmit}>
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
