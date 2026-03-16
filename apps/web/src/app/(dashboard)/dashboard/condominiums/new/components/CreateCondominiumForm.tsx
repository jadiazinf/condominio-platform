'use client'

import { FormProvider } from 'react-hook-form'

import { useCreateCondominiumWizard, type TWizardStep } from '../hooks/useCreateCondominiumWizard'

import { CondominiumInfoStep } from './CondominiumInfoStep'
import { BuildingsStep } from './BuildingsStep'
import { UnitsStep } from './UnitsStep'
import { ReviewStep } from './ReviewStep'
import { SubmissionProgressModal } from './SubmissionProgressModal'

import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { MultiStepFormShell } from '@/ui/components/forms/MultiStepFormShell'
import { useTranslation } from '@/contexts'

interface CreateCondominiumFormProps {
  adminCompanyId?: string
  adminCompanyName?: string
}

export function CreateCondominiumForm({
  adminCompanyId,
  adminCompanyName,
}: CreateCondominiumFormProps) {
  const { t } = useTranslation()

  const wizard = useCreateCondominiumWizard({ adminCompanyId })

  const steps: IStepItem<TWizardStep>[] = [
    { key: 'condominium', title: t('superadmin.condominiums.wizard.steps.condominiumInfo') },
    { key: 'buildings', title: t('superadmin.condominiums.wizard.steps.buildings') },
    { key: 'units', title: t('superadmin.condominiums.wizard.steps.units') },
    { key: 'review', title: t('superadmin.condominiums.wizard.steps.review') },
  ]

  return (
    <FormProvider {...wizard.form}>
      <MultiStepFormShell
        currentStepIndex={wizard.currentStepIndex}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        isSubmitDisabled={wizard.isSubmitting}
        isSubmitting={wizard.isSubmitting}
        minHeight="auto"
        nextButtonText={t('common.next')}
        previousButtonText={t('common.previous')}
        stepIndicator={
          <Stepper<TWizardStep>
            currentStep={wizard.currentStep}
            steps={steps}
            onStepChange={wizard.goToStep}
          />
        }
        submitButtonText={t('superadmin.condominiums.form.submit')}
        submittingButtonText={t('superadmin.condominiums.form.submitting')}
        totalSteps={wizard.totalSteps}
        onNext={wizard.goToNextStep}
        onPrevious={wizard.goToPreviousStep}
        onSubmit={wizard.handleSubmit}
      >
        {wizard.currentStep === 'condominium' && (
          <CondominiumInfoStep adminCompanyName={adminCompanyName} wizard={wizard} />
        )}
        {wizard.currentStep === 'buildings' && <BuildingsStep wizard={wizard} />}
        {wizard.currentStep === 'units' && <UnitsStep wizard={wizard} />}
        {wizard.currentStep === 'review' && <ReviewStep wizard={wizard} />}
      </MultiStepFormShell>

      <SubmissionProgressModal
        state={wizard.submissionState}
        onClose={wizard.resetSubmission}
        onNavigate={wizard.navigateToCondominium}
      />
    </FormProvider>
  )
}
