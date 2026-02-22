'use client'

import { FormProvider } from 'react-hook-form'
import { MultiStepFormShell } from '@/ui/components/forms'

import { useTranslation } from '@/contexts'

import { useCreateCompanyForm } from '../../hooks'
import { CompanyStepForm } from './CompanyStepForm'
import { AdminStepForm } from './AdminStepForm'
import { ConfirmationStep } from './ConfirmationStep'
import { Building2, User, CheckCircle } from 'lucide-react'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import type { TFormStep } from '../../hooks'

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
          <Stepper
            currentStep={currentStep}
            steps={steps.map((step): IStepItem<TFormStep> => ({
              key: step,
              title: t(`superadmin.companies.form.steps.${step}`),
              icon: step === 'company' ? <Building2 size={14} /> : step === 'admin' ? <User size={14} /> : <CheckCircle size={14} />,
            }))}
            onStepChange={goToStep}
          />
        }
      >
        {renderStepContent()}
      </MultiStepFormShell>
    </FormProvider>
  )
}
