'use client'

import { cn } from '@/ui/utils'
import { User, Shield, CheckCircle, UserCog, Building, FileCheck } from 'lucide-react'

import { useTranslation } from '@/contexts'
import type { TUserFormStep } from '../hooks/useCreateUserForm'

interface StepIndicatorProps {
  currentStep: TUserFormStep
  steps: TUserFormStep[]
  canGoToStep: (step: TUserFormStep) => boolean
  onStepClick: (step: TUserFormStep) => void
}

const STEP_ICONS: Record<TUserFormStep, React.ReactNode> = {
  basic: <User size={18} />,
  userType: <UserCog size={18} />,
  condominium: <Building size={18} />,
  role: <Shield size={18} />,
  permissions: <CheckCircle size={18} />,
  confirmation: <FileCheck size={18} />,
}

export function StepIndicator({ currentStep, steps, canGoToStep, onStepClick }: StepIndicatorProps) {
  const { t } = useTranslation()

  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {steps.map((step, index) => {
        const isActive = step === currentStep
        const isCompleted = index < currentIndex
        const canNavigate = canGoToStep(step)

        return (
          <button
            key={step}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isActive && 'bg-primary/10 text-primary',
              isCompleted && 'text-success',
              !isActive && !isCompleted && 'text-default-500',
              canNavigate && 'hover:bg-default-100',
              !canNavigate && 'cursor-not-allowed opacity-50'
            )}
            disabled={!canNavigate}
            type="button"
            onClick={() => canNavigate && onStepClick(step)}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                isActive && 'bg-primary text-white',
                isCompleted && 'bg-success text-white',
                !isActive && !isCompleted && 'bg-default-200'
              )}
            >
              {STEP_ICONS[step]}
            </span>
            <span className="hidden sm:inline">
              {t(`superadmin.users.create.steps.${step}`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
