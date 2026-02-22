'use client'

import { cn } from '@/ui/utils'
import { useControllableState } from './use-controllable-state'
import { StepperItem } from './StepperItem'
import type { IStepperProps, TStepStatus } from './stepper.types'

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
    onStepChange,
  )

  const currentIndex = steps.findIndex((s) => s.key === activeStep)
  const isHorizontal = orientation === 'horizontal'

  const getStepStatus = (index: number): TStepStatus => {
    if (index < currentIndex) return 'completed'
    if (index === currentIndex) return 'current'
    return 'upcoming'
  }

  return (
    <nav aria-label="Progress steps" className={cn('max-w-full overflow-x-auto', className)}>
      <ol
        className={cn(
          isHorizontal ? 'flex flex-row flex-nowrap' : 'flex flex-col items-start',
        )}
      >
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(
              'relative flex items-start',
              isHorizontal && index < steps.length - 1 && 'w-full',
            )}
          >
            <StepperItem
              step={step}
              index={index}
              status={getStepStatus(index)}
              color={color}
              size={size}
              orientation={orientation}
              isClickable={isClickable}
              isDisabled={isDisabled}
              hideLabelsOnMobile={hideLabelsOnMobile}
              disableAnimation={disableAnimation}
              showConnector={index < steps.length - 1}
              isConnectorCompleted={index < currentIndex}
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
