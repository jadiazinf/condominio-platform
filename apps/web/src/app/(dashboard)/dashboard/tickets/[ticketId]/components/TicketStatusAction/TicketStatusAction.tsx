'use client'

import { useState } from 'react'
import { Button } from '@/ui/components/button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { Chip } from '@/ui/components/chip'
import { Settings, Check } from 'lucide-react'
import type { TTicketStatus } from '@packages/domain'

export interface ITicketStatusActionTranslations {
  changeStatus: string
  statuses: {
    open: string
    in_progress: string
    waiting_customer: string
    resolved: string
    closed: string
    cancelled: string
  }
}

interface ITicketStatusActionProps {
  currentStatus: TTicketStatus
  translations: ITicketStatusActionTranslations
  onStatusChange: (status: TTicketStatus) => void
  isLoading?: boolean
  iconOnly?: boolean
}

export function TicketStatusAction({
  currentStatus,
  translations,
  onStatusChange,
  isLoading = false,
  iconOnly = false,
}: ITicketStatusActionProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [selectedStatus, setSelectedStatus] = useState<TTicketStatus>(currentStatus)

  const statuses: TTicketStatus[] = [
    'open',
    'in_progress',
    'waiting_customer',
  ]

  const getStatusColor = (
    status: TTicketStatus
  ): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'open':
        return 'primary'
      case 'in_progress':
        return 'warning'
      case 'waiting_customer':
        return 'default'
      case 'resolved':
        return 'success'
      case 'closed':
        return 'default'
      case 'cancelled':
        return 'danger'
      default:
        return 'default'
    }
  }

  const handleConfirm = () => {
    if (selectedStatus !== currentStatus) {
      onStatusChange(selectedStatus)
    }
    onClose()
  }

  const handleOpen = () => {
    setSelectedStatus(currentStatus)
    onOpen()
  }

  return (
    <>
      <Button
        color="default"
        isDisabled={isLoading}
        isIconOnly={iconOnly}
        size="sm"
        variant="light"
        aria-label={translations.changeStatus}
        onPress={handleOpen}
      >
        <Settings size={18} />
      </Button>

      <Modal isOpen={isOpen} size="sm" onOpenChange={onOpenChange}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>{translations.changeStatus}</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        selectedStatus === status
                          ? 'border-primary bg-primary/10'
                          : 'border-default-200 hover:bg-default-100'
                      } ${status === currentStatus ? 'opacity-50' : ''}`}
                      disabled={status === currentStatus}
                      onClick={() => setSelectedStatus(status)}
                    >
                      <Chip color={getStatusColor(status)} size="sm" variant="flat">
                        {translations.statuses[status]}
                      </Chip>
                      {selectedStatus === status && (
                        <Check className="text-primary" size={18} />
                      )}
                    </button>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  isDisabled={selectedStatus === currentStatus || isLoading}
                  isLoading={isLoading}
                  onPress={handleConfirm}
                >
                  Confirmar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
