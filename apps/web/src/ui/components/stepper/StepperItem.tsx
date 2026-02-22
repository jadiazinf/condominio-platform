'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/ui/utils'
import { StepperConnector } from './StepperConnector'
import type { IStepperItemProps, TStepperColor, TStepperSize, TStepStatus } from './stepper.types'

const sizeMap: Record<TStepperSize, { circle: string; circleH: string; icon: number; text: string; title: string; desc: string }> = {
  sm: { circle: 'h-6 w-6', circleH: 'h-6', icon: 12, text: 'text-xs', title: 'text-xs', desc: 'text-[10px]' },
  md: { circle: 'h-8 w-8', circleH: 'h-8', icon: 14, text: 'text-sm', title: 'text-sm', desc: 'text-xs' },
  lg: { circle: 'h-10 w-10', circleH: 'h-10', icon: 16, text: 'text-base', title: 'text-base', desc: 'text-sm' },
}

// Completed = solid fill + check. Current/upcoming = bordered outline.
const indicatorColors: Record<TStepperColor, Record<TStepStatus, string>> = {
  default: {
    completed: 'bg-default-400 text-white',
    current: 'border-2 border-default-400 bg-transparent text-default-600',
    upcoming: 'border-2 border-default-200 bg-transparent text-default-400',
  },
  primary: {
    completed: 'bg-primary text-primary-foreground',
    current: 'border-2 border-primary bg-transparent text-primary',
    upcoming: 'border-2 border-default-200 bg-transparent text-default-400',
  },
  secondary: {
    completed: 'bg-secondary text-secondary-foreground',
    current: 'border-2 border-secondary bg-transparent text-secondary',
    upcoming: 'border-2 border-default-200 bg-transparent text-default-400',
  },
  success: {
    completed: 'bg-success text-success-foreground',
    current: 'border-2 border-success bg-transparent text-success',
    upcoming: 'border-2 border-default-200 bg-transparent text-default-400',
  },
  warning: {
    completed: 'bg-warning text-warning-foreground',
    current: 'border-2 border-warning bg-transparent text-warning',
    upcoming: 'border-2 border-default-200 bg-transparent text-default-400',
  },
  danger: {
    completed: 'bg-danger text-danger-foreground',
    current: 'border-2 border-danger bg-transparent text-danger',
    upcoming: 'border-2 border-default-200 bg-transparent text-default-400',
  },
}

const titleColors: Record<TStepStatus, string> = {
  completed: 'text-foreground',
  current: 'text-foreground font-semibold',
  upcoming: 'text-default-400',
}

export function StepperItem<T extends string>({
  step,
  index,
  status,
  color,
  size,
  orientation,
  isClickable,
  isDisabled,
  hideLabelsOnMobile,
  disableAnimation,
  showConnector,
  isConnectorCompleted,
  onClick,
}: IStepperItemProps<T>) {
  const sizes = sizeMap[size]
  const canClick = isClickable && !isDisabled && (status === 'completed' || status === 'current')
  const isHorizontal = orientation === 'horizontal'

  const indicatorContent =
    status === 'completed'
      ? (step.icon ?? <Check size={sizes.icon} strokeWidth={3} />)
      : (step.icon ?? <span className={cn(sizes.text, 'font-medium')}>{index + 1}</span>)

  const indicator = (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors',
        sizes.circle,
        indicatorColors[color][status],
      )}
    >
      {disableAnimation ? (
        indicatorContent
      ) : (
        <AnimatePresence mode="wait">
          <motion.span
            key={status === 'completed' ? 'check' : 'number'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {indicatorContent}
          </motion.span>
        </AnimatePresence>
      )}
    </div>
  )

  const labels = (
    <div
      className={cn(
        isHorizontal ? 'text-center' : 'text-left',
        hideLabelsOnMobile && 'hidden sm:block',
      )}
    >
      <div className={cn(sizes.title, titleColors[status])}>{step.title}</div>
      {step.description && (
        <div className={cn(sizes.desc, 'mt-0.5 text-default-400')}>{step.description}</div>
      )}
    </div>
  )

  const clickProps = {
    role: 'button' as const,
    tabIndex: canClick ? 0 : -1,
    onClick: canClick ? onClick : undefined,
    onKeyDown: canClick
      ? (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }
      : undefined,
  }

  if (isHorizontal) {
    return (
      <div className={cn('flex w-full items-start', isDisabled && 'opacity-50')}>
        {/* Step column: circle + label centered together */}
        <div
          {...clickProps}
          className={cn(
            'flex shrink-0 flex-col items-center gap-1.5 transition-opacity',
            canClick && 'cursor-pointer hover:opacity-80',
            !canClick && 'cursor-default',
          )}
          aria-current={status === 'current' ? 'step' : undefined}
        >
          {indicator}
          {labels}
        </div>
        {/* Connector: flex-1 fills remaining width, same height as circle for vertical alignment */}
        {showConnector && (
          <div className={cn('flex flex-1 items-center', sizes.circleH)}>
            <StepperConnector
              isCompleted={isConnectorCompleted}
              color={color}
              orientation={orientation}
              disableAnimation={disableAnimation}
            />
          </div>
        )}
      </div>
    )
  }

  // Vertical layout
  return (
    <div className={cn('flex flex-col', isDisabled && 'opacity-50')}>
      <div
        {...clickProps}
        className={cn(
          'flex items-center gap-3 transition-opacity',
          canClick && 'cursor-pointer hover:opacity-80',
          !canClick && 'cursor-default',
        )}
        aria-current={status === 'current' ? 'step' : undefined}
      >
        {indicator}
        {labels}
      </div>
      {showConnector && (
        <StepperConnector
          isCompleted={isConnectorCompleted}
          color={color}
          orientation={orientation}
          disableAnimation={disableAnimation}
        />
      )}
    </div>
  )
}
