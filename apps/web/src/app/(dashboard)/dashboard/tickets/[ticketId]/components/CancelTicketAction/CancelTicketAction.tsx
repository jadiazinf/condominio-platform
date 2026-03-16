'use client'

import { Ban } from 'lucide-react'

import { Button } from '@/ui/components/button'

interface ICancelTicketActionProps {
  label: string
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

export function CancelTicketAction({
  label,
  onCancel,
  isLoading = false,
  className,
}: ICancelTicketActionProps) {
  return (
    <Button
      className={className}
      color="warning"
      isDisabled={isLoading}
      isLoading={isLoading}
      size="sm"
      startContent={!isLoading && <Ban size={16} />}
      variant="flat"
      onPress={onCancel}
    >
      {label}
    </Button>
  )
}
