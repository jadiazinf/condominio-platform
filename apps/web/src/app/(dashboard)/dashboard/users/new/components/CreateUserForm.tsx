'use client'

import { FormProvider } from 'react-hook-form'
import { MultiStepFormShell } from '@/ui/components/forms'

import { useTranslation } from '@/contexts'
import { useCreateUserForm } from '../hooks'
import { User, UserCog, Building, Shield, CheckCircle, FileCheck } from 'lucide-react'
import { Stepper, type IStepItem } from '@/ui/components/stepper'
import type { TUserFormStep } from '../hooks/useCreateUserForm'
import { BasicInfoStep } from './BasicInfoStep'
import { UserTypeSelectionStep } from './UserTypeSelectionStep'
import { CondominiumSelectionStep } from './CondominiumSelectionStep'
import { RoleAssignmentStep } from './RoleAssignmentStep'
import { PermissionsStep } from './PermissionsStep'
import { ConfirmationStep } from './ConfirmationStep'

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
            translateError={translateError}
            page={condominiumPage}
            limit={condominiumLimit}
            total={condominiumTotal}
            totalPages={condominiumTotalPages}
            search={condominiumSearch}
            onPageChange={onCondominiumPageChange}
            onLimitChange={onCondominiumLimitChange}
            onSearchChange={onCondominiumSearchChange}
          />
        )

      case 'role':
        return (
          <RoleAssignmentStep
            roles={roles}
            isLoadingRoles={isLoadingRoles}
            translateError={translateError}
          />
        )

      case 'permissions':
        return (
          <PermissionsStep
            rolePermissions={rolePermissions}
            customPermissions={customPermissions}
            onTogglePermission={togglePermission}
            isLoading={isLoadingPermissions}
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
            userType={formValues.userType}
            condominium={selectedCondominium}
            role={selectedRole}
            permissions={rolePermissions}
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

  const stepItems: IStepItem<TUserFormStep>[] = steps.map((step) => ({
    key: step,
    title: t(`superadmin.users.create.steps.${step}`),
    icon: STEP_ICONS[step],
  }))

  return (
    <FormProvider {...form}>
      <MultiStepFormShell
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isSubmitting={isSubmitting}
        isNextDisabled={!canGoNext}
        isSubmitDisabled={!canSubmit}
        onSubmit={handleSubmit}
        onPrevious={handlePrevious}
        onNext={handleNext}
        previousButtonText={t('common.previous')}
        nextButtonText={t('common.next')}
        submitButtonText={t('superadmin.users.create.submit')}
        stepIndicator={
          <Stepper
            currentStep={currentStep}
            steps={stepItems}
            onStepChange={goToStep}
          />
        }
      >
        {renderStepContent()}
      </MultiStepFormShell>
    </FormProvider>
  )
}
