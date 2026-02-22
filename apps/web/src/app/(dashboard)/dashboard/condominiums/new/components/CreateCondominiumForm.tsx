'use client'

import { FormProvider } from 'react-hook-form'

import { useTranslation } from '@/contexts'
import { MultiStepFormShell } from '@/ui/components/forms/MultiStepFormShell'
import { Stepper, type IStepItem } from '@/ui/components/stepper'

import { useCreateCondominiumWizard, type TWizardStep } from '../hooks/useCreateCondominiumWizard'
import { CondominiumInfoStep } from './CondominiumInfoStep'
import { BuildingsStep } from './BuildingsStep'
import { UnitsStep } from './UnitsStep'
import { ReviewStep } from './ReviewStep'
import { SubmissionProgressModal } from './SubmissionProgressModal'

interface CreateCondominiumFormProps {
  adminCompanyId?: string
  adminCompanyName?: string
}

export function CreateCondominiumForm({ adminCompanyId, adminCompanyName }: CreateCondominiumFormProps) {
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
        totalSteps={wizard.totalSteps}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        isSubmitting={wizard.isSubmitting}
        onPrevious={wizard.goToPreviousStep}
        onNext={wizard.goToNextStep}
        onSubmit={wizard.handleSubmit}
        previousButtonText={t('common.previous')}
        nextButtonText={t('common.next')}
        submitButtonText={t('superadmin.condominiums.form.submit')}
        submittingButtonText={t('superadmin.condominiums.form.submitting')}
        isSubmitDisabled={wizard.isSubmitting}
        minHeight="auto"
        stepIndicator={
          <Stepper<TWizardStep>
            steps={steps}
            currentStep={wizard.currentStep}
            onStepChange={wizard.goToStep}
          />
        }
      >
        {wizard.currentStep === 'condominium' && (
          <CondominiumInfoStep wizard={wizard} adminCompanyName={adminCompanyName} />
        )}
        {wizard.currentStep === 'buildings' && <BuildingsStep wizard={wizard} />}
        {wizard.currentStep === 'units' && <UnitsStep wizard={wizard} />}
        {wizard.currentStep === 'review' && <ReviewStep wizard={wizard} />}
      </MultiStepFormShell>

      <SubmissionProgressModal
        state={wizard.submissionState}
        onNavigate={wizard.navigateToCondominium}
        onClose={wizard.resetSubmission}
      />
    </FormProvider>
  )
}
