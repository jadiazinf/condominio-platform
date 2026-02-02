'use client'

import { ReactNode } from 'react'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Progress } from '@/ui/components/progress'
import { cn } from '@/ui/utils'

interface IMultiStepFormShellProps<TStep extends string = string> {
  /** Form content to render inside the card */
  children: ReactNode
  /** Form submission handler - only called when submit button is clicked */
  onSubmit: () => void
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Total number of steps */
  totalSteps: number
  /** Whether this is the first step */
  isFirstStep: boolean
  /** Whether this is the last step */
  isLastStep: boolean
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Whether the form is loading/validating (shows on Next button) */
  isLoading?: boolean
  /** Text for the "Previous" button */
  previousButtonText: string
  /** Text for the "Next" button */
  nextButtonText: string
  /** Text for the submit button (shown on last step) */
  submitButtonText: string
  /** Text shown on submit button while submitting */
  submittingButtonText?: string
  /** Handler for going to previous step */
  onPrevious: () => void
  /** Handler for going to next step */
  onNext: () => void
  /** Optional step indicator component */
  stepIndicator?: ReactNode
  /** Whether to show the progress bar */
  showProgress?: boolean
  /** Optional className for the card */
  className?: string
  /** Minimum height for the content area */
  minHeight?: string
  /** Whether the next button should be disabled */
  isNextDisabled?: boolean
  /** Whether the submit button should be disabled */
  isSubmitDisabled?: boolean
}

/**
 * Consistent multi-step form container with progress, step indicator, and navigation
 * NOTE: This component does NOT use a <form> wrapper to prevent accidental submits
 * Submit only happens when the user explicitly clicks the submit button
 */
export function MultiStepFormShell<TStep extends string = string>({
  children,
  onSubmit,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  isSubmitting = false,
  isLoading = false,
  previousButtonText,
  nextButtonText,
  submitButtonText,
  submittingButtonText,
  onPrevious,
  onNext,
  stepIndicator,
  showProgress = true,
  className,
  minHeight = '400px',
  isNextDisabled = false,
  isSubmitDisabled = false,
}: IMultiStepFormShellProps<TStep>) {
  const progressValue = ((currentStepIndex + 1) / totalSteps) * 100

  return (
    <Card className={cn('border border-default-200', className)} shadow="none">
      <CardBody className="gap-6 p-6">
        {/* Progress and step indicator */}
        {(showProgress || stepIndicator) && (
          <div className="space-y-4">
            {showProgress && (
              <Progress
                aria-label="Form progress"
                classNames={{
                  indicator: 'bg-primary',
                }}
                value={progressValue}
              />
            )}
            {stepIndicator}
          </div>
        )}

        {/* Step content */}
        <div style={{ minHeight }}>{children}</div>

        {/* Navigation buttons */}
        <div className="flex justify-end gap-3 border-t border-default-200 pt-4">
          {!isFirstStep && (
            <Button
              isDisabled={isSubmitting || isLoading}
              variant="bordered"
              onPress={onPrevious}
            >
              {previousButtonText}
            </Button>
          )}

          {isLastStep ? (
            <Button
              color="primary"
              isLoading={isSubmitting}
              isDisabled={isSubmitDisabled || isSubmitting}
              onPress={onSubmit}
            >
              {isSubmitting && submittingButtonText ? submittingButtonText : submitButtonText}
            </Button>
          ) : (
            <Button
              color="primary"
              isLoading={isLoading}
              isDisabled={isNextDisabled || isLoading}
              onPress={onNext}
            >
              {nextButtonText}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export type { IMultiStepFormShellProps }
