'use client'

import { Button } from '@/ui/components/button'
import { XCircle } from 'lucide-react'

interface ITicketCloseActionProps {
  label: string
  onClose: () => void
  isLoading?: boolean
}

export function TicketCloseAction({ label, onClose, isLoading = false }: ITicketCloseActionProps) {
  return (
    <Button
      color="danger"
      isDisabled={isLoading}
      isLoading={isLoading}
      size="sm"
      startContent={!isLoading && <XCircle size={16} />}
      variant="flat"
      onPress={onClose}
    >
      {label}
    </Button>
  )
}
