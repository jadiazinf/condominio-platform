'use client'

import type { TStepperColor } from './stepper.types'

import { motion } from 'framer-motion'

import { cn } from '@/ui/utils'

const colorMap: Record<TStepperColor, string> = {
  default: 'bg-default-400',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

interface IStepperProgressBarProps {
  currentIndex: number
  totalSteps: number
  currentTitle: string
  color: TStepperColor
  disableAnimation: boolean
}

export function StepperProgressBar({
  currentIndex,
  totalSteps,
  currentTitle,
  color,
  disableAnimation,
}: IStepperProgressBarProps) {
  const progress = ((currentIndex + 1) / totalSteps) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{currentTitle}</span>
        <span className="text-default-400">
          {currentIndex + 1}/{totalSteps}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-default-200">
        {disableAnimation ? (
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full', colorMap[color])}
            style={{ width: `${progress}%` }}
          />
        ) : (
          <motion.div
            animate={{ width: `${progress}%` }}
            className={cn('absolute inset-y-0 left-0 rounded-full', colorMap[color])}
            initial={false}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        )}
      </div>
    </div>
  )
}
