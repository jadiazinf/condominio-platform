'use client'

import { CheckCircle } from 'lucide-react'

import { Button } from '@/ui/components/button'

interface ITicketResolveActionProps {
  label: string
  onResolve: () => void
  isLoading?: boolean
  className?: string
}

export function TicketResolveAction({
  label,
  onResolve,
  isLoading = false,
  className,
}: ITicketResolveActionProps) {
  return (
    <Button
      className={className}
      color="success"
      isDisabled={isLoading}
      isLoading={isLoading}
      size="sm"
      startContent={!isLoading && <CheckCircle size={16} />}
      variant="flat"
      onPress={onResolve}
    >
      {label}
    </Button>
  )
}
