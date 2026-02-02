'use client'

import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Textarea } from '@/ui/components/textarea'
import { XCircle } from 'lucide-react'

export interface ICloseTicketModalTranslations {
  trigger: string
  title: string
  solutionLabel: string
  solutionPlaceholder: string
  cancel: string
  confirm: string
  confirmClosing: string
}

interface ICloseTicketModalProps {
  translations: ICloseTicketModalTranslations
  onConfirm: (solution: string) => void
  isLoading?: boolean
  className?: string
}

export function CloseTicketModal({
  translations,
  onConfirm,
  isLoading = false,
  className,
}: ICloseTicketModalProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [solution, setSolution] = useState('')

  const handleConfirm = () => {
    onConfirm(solution)
    setSolution('')
  }

  const handleCancel = () => {
    setSolution('')
    onClose()
  }

  return (
    <>
      <Button
        className={className}
        color="danger"
        isDisabled={isLoading}
        size="sm"
        startContent={<XCircle size={16} />}
        variant="flat"
        onPress={onOpen}
      >
        {translations.trigger}
      </Button>

      <Modal isOpen={isOpen} size="lg" onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold">{translations.title}</h3>
              </ModalHeader>
              <ModalBody>
                <Textarea
                  variant="bordered"
                  size="md"
                  minRows={5}
                  isDisabled={isLoading}
                  label={translations.solutionLabel}
                  placeholder={translations.solutionPlaceholder}
                  value={solution}
                  onValueChange={setSolution}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="default" isDisabled={isLoading} variant="light" onPress={handleCancel}>
                  {translations.cancel}
                </Button>
                <Button
                  color="danger"
                  isDisabled={!solution.trim() || isLoading}
                  isLoading={isLoading}
                  onPress={handleConfirm}
                >
                  {isLoading ? translations.confirmClosing : translations.confirm}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
