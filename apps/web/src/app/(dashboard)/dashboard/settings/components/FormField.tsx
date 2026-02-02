import { cn } from '@/ui/utils'

interface IFormFieldProps {
  children: React.ReactNode
  className?: string
}

export function FormField({ children, className }: IFormFieldProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-default-50 dark:bg-default-100/50 p-4 border border-default-200',
        className
      )}
    >
      {children}
    </div>
  )
}

interface IFormFieldGroupProps {
  children: React.ReactNode
  className?: string
}

export function FormFieldGroup({ children, className }: IFormFieldGroupProps) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>
}

interface IFormFieldRowProps {
  children: React.ReactNode
  className?: string
}

export function FormFieldRow({ children, className }: IFormFieldRowProps) {
  return <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>{children}</div>
}
