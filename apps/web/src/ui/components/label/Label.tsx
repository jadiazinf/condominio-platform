'use client'

import { ReactNode } from 'react'
import { cn } from '@heroui/theme'

interface ILabelProps {
  htmlFor?: string
  children: ReactNode
  required?: boolean
  className?: string
}

export function Label({ htmlFor, children, required = false, className }: ILabelProps) {
  return (
    <label
      className={cn('text-sm font-medium text-foreground', 'flex items-center gap-1', className)}
      htmlFor={htmlFor}
    >
      {required && <span className="text-danger">*</span>}
      {children}
    </label>
  )
}

export type { ILabelProps }
