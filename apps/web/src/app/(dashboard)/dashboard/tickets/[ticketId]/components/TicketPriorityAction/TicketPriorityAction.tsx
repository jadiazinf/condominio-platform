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
import { AlertCircle, Check } from 'lucide-react'
import type { TTicketPriority } from '@packages/domain'

export interface ITicketPriorityActionTranslations {
  changePriority: string
  priorities: {
    low: string
    medium: string
    high: string
    urgent: string
  }
}

interface ITicketPriorityActionProps {
  currentPriority: TTicketPriority
  translations: ITicketPriorityActionTranslations
  onPriorityChange: (priority: TTicketPriority) => void
  isLoading?: boolean
  iconOnly?: boolean
}

export function TicketPriorityAction({
  currentPriority,
  translations,
  onPriorityChange,
  isLoading = false,
  iconOnly = false,
}: ITicketPriorityActionProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [selectedPriority, setSelectedPriority] = useState<TTicketPriority>(currentPriority)

  const priorities: TTicketPriority[] = ['low', 'medium', 'high', 'urgent']

  const getPriorityColor = (
    priority: TTicketPriority
  ): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (priority) {
      case 'urgent':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'primary'
      default:
        return 'default'
    }
  }

  const handleConfirm = () => {
    if (selectedPriority !== currentPriority) {
      onPriorityChange(selectedPriority)
    }
    onClose()
  }

  const handleOpen = () => {
    setSelectedPriority(currentPriority)
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
        aria-label={translations.changePriority}
        onPress={handleOpen}
      >
        <AlertCircle size={18} />
      </Button>

      <Modal isOpen={isOpen} size="sm" onOpenChange={onOpenChange}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>{translations.changePriority}</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-2">
                  {priorities.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        selectedPriority === priority
                          ? 'border-primary bg-primary/10'
                          : 'border-default-200 hover:bg-default-100'
                      } ${priority === currentPriority ? 'opacity-50' : ''}`}
                      disabled={priority === currentPriority}
                      onClick={() => setSelectedPriority(priority)}
                    >
                      <Chip color={getPriorityColor(priority)} size="sm" variant="flat">
                        {translations.priorities[priority]}
                      </Chip>
                      {selectedPriority === priority && (
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
                  isDisabled={selectedPriority === currentPriority || isLoading}
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
