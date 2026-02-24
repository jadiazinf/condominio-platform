'use client'

import { motion } from 'framer-motion'
import { cn } from '@/ui/utils'
import type { IStepperConnectorProps, TStepperColor } from './stepper.types'

const colorMap: Record<TStepperColor, { completed: string; track: string }> = {
  default: { completed: 'bg-default-400', track: 'bg-default-200' },
  primary: { completed: 'bg-primary', track: 'bg-default-200' },
  secondary: { completed: 'bg-secondary', track: 'bg-default-200' },
  success: { completed: 'bg-success', track: 'bg-default-200' },
  warning: { completed: 'bg-warning', track: 'bg-default-200' },
  danger: { completed: 'bg-danger', track: 'bg-default-200' },
}

export function StepperConnector({
  isCompleted,
  color,
  orientation,
  disableAnimation,
}: IStepperConnectorProps) {
  const colors = colorMap[color]
  const isHorizontal = orientation === 'horizontal'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full',
        isHorizontal ? 'h-0.5 flex-1 min-w-4 mx-1.5' : 'w-0.5 min-h-6 ml-4 my-1',
        colors.track,
      )}
    >
      {disableAnimation ? (
        <div
          className={cn(
            'absolute rounded-full',
            isHorizontal ? 'inset-y-0 left-0' : 'inset-x-0 top-0',
            isCompleted ? 'h-full w-full' : isHorizontal ? 'w-0' : 'h-0',
            colors.completed,
          )}
        />
      ) : (
        <motion.div
          className={cn(
            'absolute rounded-full',
            isHorizontal ? 'inset-y-0 left-0' : 'inset-x-0 top-0',
            colors.completed,
          )}
          initial={false}
          animate={
            isHorizontal
              ? { width: isCompleted ? '100%' : '0%' }
              : { height: isCompleted ? '100%' : '0%' }
          }
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
