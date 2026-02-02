'use client'

import { ReactNode } from 'react'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { cn } from '@/ui/utils'

interface IFormShellProps {
  /** Form content to render inside the card */
  children: ReactNode
  /** Form submission handler */
  onSubmit: (e: React.FormEvent) => void
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Text for the submit button */
  submitButtonText: string
  /** Text shown on submit button while submitting */
  submittingButtonText?: string
  /** Optional cancel button text (if provided, cancel button will be shown) */
  cancelButtonText?: string
  /** Cancel button handler */
  onCancel?: () => void
  /** Whether to disable the submit button */
  isSubmitDisabled?: boolean
  /** Additional actions to render in the footer (before cancel/submit buttons) */
  additionalActions?: ReactNode
  /** Optional className for the card */
  className?: string
  /** Minimum height for the content area */
  minHeight?: string
}

/**
 * Consistent form container with card styling and action buttons
 *
 * @example
 * <FormShell
 *   onSubmit={handleSubmit}
 *   submitButtonText="Save"
 *   isSubmitting={isSubmitting}
 * >
 *   <InputField name="email" label="Email" />
 * </FormShell>
 */
export function FormShell({
  children,
  onSubmit,
  isSubmitting = false,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onCancel,
  isSubmitDisabled = false,
  additionalActions,
  className,
  minHeight = '400px',
}: IFormShellProps) {
  return (
    <form onSubmit={onSubmit}>
      <Card className={cn('border border-default-200', className)} shadow="none">
        <CardBody className="gap-6 p-6">
          {/* Form content */}
          <div style={{ minHeight }}>{children}</div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-default-200 pt-4">
            {additionalActions}

            {cancelButtonText && onCancel && (
              <Button
                isDisabled={isSubmitting}
                variant="bordered"
                onPress={onCancel}
                type="button"
              >
                {cancelButtonText}
              </Button>
            )}

            <Button
              color="primary"
              isLoading={isSubmitting}
              isDisabled={isSubmitDisabled || isSubmitting}
              type="submit"
            >
              {isSubmitting && submittingButtonText ? submittingButtonText : submitButtonText}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  )
}

export type { IFormShellProps }
