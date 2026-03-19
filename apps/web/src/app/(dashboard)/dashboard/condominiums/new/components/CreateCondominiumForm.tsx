'use client'

import type { TManagementCompanySubscription } from '@packages/domain'
import type { TManagementCompanyUsageStats } from '@packages/http-client'

import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { ArrowLeft, CreditCard } from 'lucide-react'

import { useCreateCondominiumWizard, type TWizardStep } from '../hooks/useCreateCondominiumWizard'

import { CondominiumInfoStep } from './CondominiumInfoStep'
import { BuildingsStep } from './BuildingsStep'
import { UnitsStep } from './UnitsStep'
import { ReviewStep } from './ReviewStep'
import { SubmissionProgressModal } from './SubmissionProgressModal'

import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { MultiStepFormShell } from '@/ui/components/forms/MultiStepFormShell'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { SubscriptionDetailModal } from '@/app/(dashboard)/dashboard/subscription/components/SubscriptionDetailModal'

interface CreateCondominiumFormProps {
  adminCompanyId?: string
  adminCompanyName?: string
  title: string
  subtitle: string
  subscription?: TManagementCompanySubscription | null
  usageStats?: TManagementCompanyUsageStats | null
}

export function CreateCondominiumForm({
  adminCompanyId,
  adminCompanyName,
  title,
  subtitle,
  subscription,
  usageStats,
}: CreateCondominiumFormProps) {
  const { t } = useTranslation()
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)

  const wizard = useCreateCondominiumWizard({ adminCompanyId })

  const steps: IStepItem<TWizardStep>[] = [
    { key: 'condominium', title: t('superadmin.condominiums.wizard.steps.condominiumInfo') },
    { key: 'buildings', title: t('superadmin.condominiums.wizard.steps.buildings') },
    { key: 'units', title: t('superadmin.condominiums.wizard.steps.units') },
    { key: 'review', title: t('superadmin.condominiums.wizard.steps.review') },
  ]

  return (
    <FormProvider {...wizard.form}>
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button isIconOnly className="mt-1" href="/dashboard/condominiums" variant="flat">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <Typography variant="h2">{title}</Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {subtitle}
            </Typography>
          </div>
        </div>
        {subscription && (
          <Button
            className="shrink-0"
            size="sm"
            startContent={<CreditCard size={16} />}
            variant="flat"
            onPress={() => setIsSubscriptionModalOpen(true)}
          >
            {t('admin.subscription.viewPlan')}
          </Button>
        )}
      </div>

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
        {wizard.currentStep === 'buildings' && (
          <BuildingsStep
            currentUnitsCount={usageStats?.unitsCount}
            maxUnits={subscription?.maxUnits}
            wizard={wizard}
          />
        )}
        {wizard.currentStep === 'units' && <UnitsStep wizard={wizard} />}
        {wizard.currentStep === 'review' && <ReviewStep wizard={wizard} />}
      </MultiStepFormShell>

      <SubmissionProgressModal
        state={wizard.submissionState}
        onClose={wizard.resetSubmission}
        onNavigate={wizard.navigateToCondominium}
      />

      {/* Subscription detail modal */}
      {subscription && (
        <SubscriptionDetailModal
          isOpen={isSubscriptionModalOpen}
          subscription={subscription}
          usageStats={usageStats}
          onClose={() => setIsSubscriptionModalOpen(false)}
        />
      )}
    </FormProvider>
  )
}
