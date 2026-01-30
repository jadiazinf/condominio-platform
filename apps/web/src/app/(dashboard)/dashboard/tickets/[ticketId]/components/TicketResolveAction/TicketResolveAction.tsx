'use client'

import { Button } from '@/ui/components/button'
import { CheckCircle } from 'lucide-react'

interface ITicketResolveActionProps {
  label: string
  onResolve: () => void
  isLoading?: boolean
}

export function TicketResolveAction({ label, onResolve, isLoading = false }: ITicketResolveActionProps) {
  return (
    <Button
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
