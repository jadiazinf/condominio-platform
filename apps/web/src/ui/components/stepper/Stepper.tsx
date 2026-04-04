'use client'

import type { IStepperProps, TStepStatus } from './stepper.types'

import { useControllableState } from './use-controllable-state'
import { StepperItem } from './StepperItem'
import { StepperProgressBar } from './StepperProgressBar'

import { cn } from '@/ui/utils'

export function Stepper<T extends string = string>({
  steps,
  currentStep,
  defaultStep,
  onStepChange,
  orientation = 'horizontal',
  color = 'primary',
  size = 'md',
  isClickable = true,
  hideLabelsOnMobile = true,
  className,
  isDisabled = false,
  disableAnimation = false,
}: IStepperProps<T>) {
  const [activeStep, setActiveStep] = useControllableState<T>(
    currentStep,
    defaultStep ?? steps[0]?.key ?? ('' as T),
    onStepChange
  )

  const currentIndex = steps.findIndex(s => s.key === activeStep)
  const isHorizontal = orientation === 'horizontal'

  const getStepStatus = (index: number): TStepStatus => {
    if (index < currentIndex) return 'completed'
    if (index === currentIndex) return 'current'

    return 'upcoming'
  }

  const showProgressBarOnMobile = isHorizontal && steps.length > 4

  return (
    <nav aria-label="Progress steps" className={cn('max-w-full', className)}>
      {/* Mobile progress bar for > 4 steps */}
      {showProgressBarOnMobile && (
        <div className="sm:hidden">
          <StepperProgressBar
            color={color}
            currentIndex={currentIndex}
            currentTitle={steps[currentIndex]?.title ?? ''}
            disableAnimation={disableAnimation}
            totalSteps={steps.length}
          />
        </div>
      )}

      {/* Full stepper (always on desktop, only on mobile when <= 4 steps) */}
      <ol className={cn(
        isHorizontal ? 'flex flex-row flex-nowrap' : 'flex flex-col items-start',
        showProgressBarOnMobile && 'hidden sm:flex'
      )}>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(
              'relative flex items-start',
              isHorizontal && index < steps.length - 1 && 'flex-1 min-w-0'
            )}
          >
            <StepperItem
              color={color}
              disableAnimation={disableAnimation}
              hideLabelsOnMobile={hideLabelsOnMobile}
              index={index}
              isClickable={isClickable}
              isConnectorCompleted={index < currentIndex}
              isDisabled={isDisabled}
              orientation={orientation}
              showConnector={index < steps.length - 1}
              size={size}
              status={getStepStatus(index)}
              step={step}
              onClick={() => {
                const status = getStepStatus(index)

                if (status === 'completed' || status === 'current') {
                  setActiveStep(step.key)
                }
              }}
            />
          </li>
        ))}
      </ol>
    </nav>
  )
}
