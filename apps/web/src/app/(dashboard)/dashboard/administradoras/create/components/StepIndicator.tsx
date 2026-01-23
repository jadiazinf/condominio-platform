'use client'

import { cn } from '@heroui/theme'
import { Building2, User, CheckCircle } from 'lucide-react'

import { useTranslation } from '@/contexts'

import type { TFormStep } from '../../hooks'

interface StepIndicatorProps {
  steps: TFormStep[]
  currentStep: TFormStep
  onStepClick: (step: TFormStep) => void
}

const STEP_ICONS: Record<TFormStep, React.ReactNode> = {
  company: <Building2 size={18} />,
  admin: <User size={18} />,
  confirmation: <CheckCircle size={18} />,
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const { t } = useTranslation()

  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isActive = step === currentStep
        const isCompleted = index < currentIndex

        return (
          <button
            key={step}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isActive && 'bg-primary/10 text-primary',
              isCompleted && 'text-success',
              !isActive && !isCompleted && 'text-default-500',
              'hover:bg-default-100'
            )}
            disabled={index > currentIndex}
            type="button"
            onClick={() => onStepClick(step)}
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
              {t(`superadmin.companies.form.steps.${step}`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
