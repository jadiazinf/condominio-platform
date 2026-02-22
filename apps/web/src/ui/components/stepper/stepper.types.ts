import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Value Types
// ─────────────────────────────────────────────────────────────────────────────

export type TStepperColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
export type TStepperOrientation = 'horizontal' | 'vertical'
export type TStepperSize = 'sm' | 'md' | 'lg'
export type TStepStatus = 'completed' | 'current' | 'upcoming'

// ─────────────────────────────────────────────────────────────────────────────
// Step Item
// ─────────────────────────────────────────────────────────────────────────────

export interface IStepItem<T extends string = string> {
  key: T
  title: string
  description?: string
  icon?: ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────────────────

export interface IStepperProps<T extends string = string> {
  steps: IStepItem<T>[]
  currentStep?: T
  defaultStep?: T
  onStepChange?: (stepKey: T) => void
  orientation?: TStepperOrientation
  color?: TStepperColor
  size?: TStepperSize
  isClickable?: boolean
  hideLabelsOnMobile?: boolean
  className?: string
  isDisabled?: boolean
  disableAnimation?: boolean
}

export interface IStepperItemProps<T extends string = string> {
  step: IStepItem<T>
  index: number
  status: TStepStatus
  color: TStepperColor
  size: TStepperSize
  orientation: TStepperOrientation
  isClickable: boolean
  isDisabled: boolean
  hideLabelsOnMobile: boolean
  disableAnimation: boolean
  showConnector: boolean
  isConnectorCompleted: boolean
  onClick: () => void
}

export interface IStepperConnectorProps {
  isCompleted: boolean
  color: TStepperColor
  orientation: TStepperOrientation
  disableAnimation: boolean
}
