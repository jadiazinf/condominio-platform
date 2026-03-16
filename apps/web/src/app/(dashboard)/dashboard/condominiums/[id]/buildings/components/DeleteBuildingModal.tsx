'use client'

import { useRouter } from 'next/navigation'
import { useDeleteBuilding } from '@packages/http-client/hooks'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'

interface IDeleteBuildingModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId: string
  buildingName: string
  translations: {
    title: string
    confirm: string
    warning: string
    cancel: string
    delete: string
    deleting: string
    success: string
    error: string
  }
}

export function DeleteBuildingModal({
  isOpen,
  onClose,
  buildingId,
  buildingName,
  translations,
}: IDeleteBuildingModalProps) {
  const toast = useToast()
  const router = useRouter()

  const deleteMutation = useDeleteBuilding({
    onSuccess: () => {
      toast.success(translations.success)
      onClose()
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.error)
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate({ buildingId })
  }

  const handleClose = () => {
    if (!deleteMutation.isPending) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} size="md" onClose={handleClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{translations.title}</Typography>
        </ModalHeader>
        <ModalBody>
          <Typography className="mb-2" variant="body1">
            {translations.confirm} <strong>{buildingName}</strong>?
          </Typography>
          <Typography color="danger" variant="body2">
            {translations.warning}
          </Typography>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={deleteMutation.isPending} variant="bordered" onPress={handleClose}>
            {translations.cancel}
          </Button>
          <Button color="danger" isLoading={deleteMutation.isPending} onPress={handleDelete}>
            {deleteMutation.isPending ? translations.deleting : translations.delete}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
