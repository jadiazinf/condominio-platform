'use client'

import type { TUserFormStep } from '../hooks/useCreateUserForm'

import { User, UserCog, Building, Shield, CheckCircle, FileCheck } from 'lucide-react'
import { FormProvider } from 'react-hook-form'

import { useCreateUserForm } from '../hooks'

import { BasicInfoStep } from './BasicInfoStep'
import { UserTypeSelectionStep } from './UserTypeSelectionStep'
import { CondominiumSelectionStep } from './CondominiumSelectionStep'
import { RoleAssignmentStep } from './RoleAssignmentStep'
import { PermissionsStep } from './PermissionsStep'
import { ConfirmationStep } from './ConfirmationStep'

import { Stepper, type IStepItem } from '@/ui/components/stepper'
import { useTranslation } from '@/contexts'
import { MultiStepFormShell } from '@/ui/components/forms'

export function CreateUserForm() {
  const { t } = useTranslation()
  const {
    form,
    currentStep,
    steps,
    isFirstStep,
    isLastStep,
    selectedUserType,
    roles,
    condominiums,
    rolePermissions,
    customPermissions,
    isSubmitting,
    isLoadingRoles,
    isLoadingCondominiums,
    isLoadingPermissions,
    condominiumPage,
    condominiumLimit,
    condominiumTotal,
    condominiumTotalPages,
    condominiumSearch,
    onCondominiumPageChange,
    onCondominiumLimitChange,
    onCondominiumSearchChange,
    canGoNext,
    canSubmit,
    handleNext,
    handlePrevious,
    goToStep,
    canGoToStep,
    togglePermission,
    handleSubmit,
    translateError,
  } = useCreateUserForm()

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return <BasicInfoStep translateError={translateError} />

      case 'userType':
        return <UserTypeSelectionStep translateError={translateError} />

      case 'condominium':
        return (
          <CondominiumSelectionStep
            condominiums={condominiums}
            isLoading={isLoadingCondominiums}
            limit={condominiumLimit}
            page={condominiumPage}
            search={condominiumSearch}
            total={condominiumTotal}
            totalPages={condominiumTotalPages}
            translateError={translateError}
            onLimitChange={onCondominiumLimitChange}
            onPageChange={onCondominiumPageChange}
            onSearchChange={onCondominiumSearchChange}
          />
        )

      case 'role':
        return (
          <RoleAssignmentStep
            isLoadingRoles={isLoadingRoles}
            roles={roles}
            translateError={translateError}
          />
        )

      case 'permissions':
        return (
          <PermissionsStep
            customPermissions={customPermissions}
            isLoading={isLoadingPermissions}
            rolePermissions={rolePermissions}
            onTogglePermission={togglePermission}
          />
        )

      case 'confirmation': {
        const formValues = form.getValues()

        // Find selected condominium and role for display (only for condominium users)
        const selectedCondominium =
          formValues.userType === 'condominium'
            ? condominiums.find(c => c.id === (formValues as any).condominiumId)
            : undefined
        const selectedRole =
          formValues.userType === 'condominium'
            ? roles.find(r => r.id === (formValues as any).roleId)
            : undefined

        return (
          <ConfirmationStep
            basicInfo={{
              email: formValues.email,
              firstName: formValues.firstName,
              lastName: formValues.lastName,
              phoneCountryCode: formValues.phoneCountryCode,
              phoneNumber: formValues.phoneNumber,
              idDocumentType: formValues.idDocumentType,
              idDocumentNumber: formValues.idDocumentNumber,
            }}
            condominium={selectedCondominium}
            permissions={rolePermissions}
            role={selectedRole}
            userType={formValues.userType}
          />
        )
      }

      default:
        return null
    }
  }

  const currentStepIndex = steps.indexOf(currentStep)

  const STEP_ICONS: Record<TUserFormStep, React.ReactNode> = {
    basic: <User size={14} />,
    userType: <UserCog size={14} />,
    condominium: <Building size={14} />,
    role: <Shield size={14} />,
    permissions: <CheckCircle size={14} />,
    confirmation: <FileCheck size={14} />,
  }

  const stepItems: IStepItem<TUserFormStep>[] = steps.map(step => ({
    key: step,
    title: t(`superadmin.users.create.steps.${step}`),
    icon: STEP_ICONS[step],
  }))

  return (
    <FormProvider {...form}>
      <MultiStepFormShell
        currentStepIndex={currentStepIndex}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isNextDisabled={!canGoNext}
        isSubmitDisabled={!canSubmit}
        isSubmitting={isSubmitting}
        nextButtonText={t('common.next')}
        previousButtonText={t('common.previous')}
        stepIndicator={
          <Stepper currentStep={currentStep} steps={stepItems} onStepChange={goToStep} />
        }
        submitButtonText={t('superadmin.users.create.submit')}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
      >
        {renderStepContent()}
      </MultiStepFormShell>
    </FormProvider>
  )
}
