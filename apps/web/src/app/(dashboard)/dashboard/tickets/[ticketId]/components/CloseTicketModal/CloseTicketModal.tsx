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
}

export function CloseTicketModal({
  translations,
  onConfirm,
  isLoading = false,
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-default-700">
                    {translations.solutionLabel}
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-default-200 bg-default-50 p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={isLoading}
                    placeholder={translations.solutionPlaceholder}
                    rows={5}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                  />
                </div>
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
