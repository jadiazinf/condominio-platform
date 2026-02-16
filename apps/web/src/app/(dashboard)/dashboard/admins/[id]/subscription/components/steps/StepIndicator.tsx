'use client'

import { cn } from '@/ui/utils'
import { Check } from 'lucide-react'
import type { TSubscriptionStep } from '../../hooks'

interface Step {
  key: TSubscriptionStep
  label: string
}

interface StepIndicatorProps {
  currentStep: TSubscriptionStep
  steps: Step[]
  onStepClick?: (step: TSubscriptionStep) => void
}

export function StepIndicator({ currentStep, steps, onStepClick }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = step.key === currentStep
        const isClickable = !!onStepClick && (isCompleted || isCurrent)

        return (
          <div key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(step.key)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                isCompleted && 'bg-success-100 text-success-700 hover:bg-success-200',
                isCurrent && 'bg-success-100 text-success-700',
                !isCompleted && !isCurrent && 'bg-default-100 text-default-400',
                isClickable && 'cursor-pointer',
                !isClickable && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  isCompleted && 'bg-success text-white',
                  isCurrent && 'bg-success text-white',
                  !isCompleted && !isCurrent && 'bg-default-300 text-default-500'
                )}
              >
                {isCompleted ? <Check size={12} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8',
                  index < currentIndex ? 'bg-success' : 'bg-default-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
