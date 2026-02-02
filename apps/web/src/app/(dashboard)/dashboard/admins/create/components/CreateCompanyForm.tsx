'use client'

import { FormProvider } from 'react-hook-form'
import { MultiStepFormShell } from '@/ui/components/forms'

import { useTranslation } from '@/contexts'

import { useCreateCompanyForm } from '../../hooks'
import { CompanyStepForm } from './CompanyStepForm'
import { AdminStepForm } from './AdminStepForm'
import { ConfirmationStep } from './ConfirmationStep'
import { StepIndicator } from './StepIndicator'

export function CreateCompanyForm() {
  const { t } = useTranslation()
  const {
    form,
    shouldShowError,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    isSubmitting,
    isValidatingAdmin,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    handleSubmit,
    translateError,
    getValues,
    steps,
  } = useCreateCompanyForm()

  const renderStepContent = () => {
    switch (currentStep) {
      case 'company':
        return (
          <CompanyStepForm
            translateError={translateError}
            shouldShowError={shouldShowError}
          />
        )
      case 'admin':
        return (
          <AdminStepForm
            translateError={translateError}
            shouldShowError={shouldShowError}
          />
        )
      case 'confirmation':
        return <ConfirmationStep data={getValues()} />
      default:
        return null
    }
  }

  return (
    <FormProvider {...form}>
      <MultiStepFormShell
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isSubmitting={isSubmitting}
        isLoading={isValidatingAdmin}
        onSubmit={handleSubmit}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        previousButtonText={t('common.previous')}
        nextButtonText={t('common.next')}
        submitButtonText={t('superadmin.companies.form.submit')}
        submittingButtonText={t('superadmin.companies.form.submitting')}
        stepIndicator={
          <StepIndicator currentStep={currentStep} onStepClick={goToStep} steps={steps} />
        }
      >
        {renderStepContent()}
      </MultiStepFormShell>
    </FormProvider>
  )
}
