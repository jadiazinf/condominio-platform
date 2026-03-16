'use client'

import type { TFormStep } from '../../hooks'

import { FormProvider } from 'react-hook-form'
import { Building2, User, CheckCircle } from 'lucide-react'

import { useCreateCompanyForm } from '../../hooks'

import { CompanyStepForm } from './CompanyStepForm'
import { AdminStepForm } from './AdminStepForm'
import { ConfirmationStep } from './ConfirmationStep'

import { useTranslation } from '@/contexts'
import { MultiStepFormShell } from '@/ui/components/forms'
import { Stepper, type IStepItem } from '@/ui/components/stepper'

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
        return <CompanyStepForm shouldShowError={shouldShowError} translateError={translateError} />
      case 'admin':
        return <AdminStepForm shouldShowError={shouldShowError} translateError={translateError} />
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
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isLoading={isValidatingAdmin}
        isSubmitting={isSubmitting}
        nextButtonText={t('common.next')}
        previousButtonText={t('common.previous')}
        stepIndicator={
          <Stepper
            currentStep={currentStep}
            steps={steps.map(
              (step): IStepItem<TFormStep> => ({
                key: step,
                title: t(`superadmin.companies.form.steps.${step}`),
                icon:
                  step === 'company' ? (
                    <Building2 size={14} />
                  ) : step === 'admin' ? (
                    <User size={14} />
                  ) : (
                    <CheckCircle size={14} />
                  ),
              })
            )}
            onStepChange={goToStep}
          />
        }
        submitButtonText={t('superadmin.companies.form.submit')}
        submittingButtonText={t('superadmin.companies.form.submitting')}
        totalSteps={totalSteps}
        onNext={goToNextStep}
        onPrevious={goToPreviousStep}
        onSubmit={handleSubmit}
      >
        {renderStepContent()}
      </MultiStepFormShell>
    </FormProvider>
  )
}
