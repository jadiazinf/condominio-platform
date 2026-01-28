'use client'

import { Card, CardBody } from '@/ui/components/card'
import { Progress } from '@/ui/components/progress'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'

import { useCreateCompanyForm, type TFormStep } from '../../hooks'
import { CompanyStepForm } from './CompanyStepForm'
import { AdminStepForm } from './AdminStepForm'
import { ConfirmationStep } from './ConfirmationStep'
import { StepIndicator } from './StepIndicator'

export function CreateCompanyForm() {
  const { t } = useTranslation()
  const {
    form,
    control,
    errors,
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
            control={control}
            errors={errors.company}
            translateError={translateError}
            shouldShowError={shouldShowError}
          />
        )
      case 'admin':
        return (
          <AdminStepForm
            control={control}
            errors={errors.admin}
            getValues={form.getValues}
            setValue={form.setValue}
            setError={form.setError}
            clearErrors={form.clearErrors}
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

  const progressValue = ((currentStepIndex + 1) / totalSteps) * 100

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border border-default-200" shadow="none">
        <CardBody className="gap-6 p-6">
          {/* Progress indicator */}
          <div className="space-y-4">
            <Progress
              aria-label="Form progress"
              classNames={{
                indicator: 'bg-primary',
              }}
              value={progressValue}
            />
            <StepIndicator currentStep={currentStep} onStepClick={goToStep} steps={steps} />
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">{renderStepContent()}</div>

          {/* Navigation buttons */}
          <div className="flex justify-end gap-3 border-t border-default-200 pt-4">
            {!isFirstStep && (
              <Button
                isDisabled={isSubmitting || isValidatingAdmin}
                variant="bordered"
                onPress={goToPreviousStep}
              >
                {t('common.previous')}
              </Button>
            )}

            {isLastStep ? (
              <Button color="primary" isLoading={isSubmitting} type="submit">
                {isSubmitting
                  ? t('superadmin.companies.form.submitting')
                  : t('superadmin.companies.form.submit')}
              </Button>
            ) : (
              <Button color="primary" isLoading={isValidatingAdmin} onPress={goToNextStep}>
                {t('common.next')}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
