'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useRemoveUserFromCondominium } from '@packages/http-client/hooks'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'

interface IRemoveUserModalProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  userId: string
  userName: string
  translations: {
    title: string
    confirm: string
    warning: string
    cancel: string
    remove: string
    removing: string
    success: string
    error: string
  }
}

export function RemoveUserModal({
  isOpen,
  onClose,
  condominiumId,
  userId,
  userName,
  translations,
}: IRemoveUserModalProps) {
  const router = useRouter()
  const toast = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const removeUserMutation = useRemoveUserFromCondominium({
    onSuccess: () => {
      toast.success(translations.success)
      onClose()
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.error)
      setIsDeleting(false)
    },
  })

  const handleRemove = () => {
    setIsDeleting(true)
    removeUserMutation.mutate({
      condominiumId,
      userId,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <AlertTriangle className="text-danger" size={20} />
          {translations.title}
        </ModalHeader>
        <ModalBody>
          <Typography variant="body1">
            {translations.confirm.replace('{name}', userName)}
          </Typography>
          <Typography className="mt-2" color="muted" variant="body2">
            {translations.warning}
          </Typography>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isDeleting} variant="flat" onPress={onClose}>
            {translations.cancel}
          </Button>
          <Button color="danger" isLoading={isDeleting} onPress={handleRemove}>
            {isDeleting ? translations.removing : translations.remove}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
