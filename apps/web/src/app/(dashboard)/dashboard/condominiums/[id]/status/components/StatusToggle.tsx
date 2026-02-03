'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Power } from 'lucide-react'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { useToast } from '@/ui/components/toast'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { useToggleCondominiumStatus } from '@packages/http-client/hooks'

interface IStatusToggleProps {
  condominiumId: string
  initialStatus: boolean
  activeLabel: string
  inactiveLabel: string
  title: string
  description: string
  successMessage: string
  errorMessage: string
}

export function StatusToggle({
  condominiumId,
  initialStatus,
  activeLabel,
  inactiveLabel,
  title,
  description,
  successMessage,
  errorMessage,
}: IStatusToggleProps) {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null)
  const toast = useToast()
  const router = useRouter()

  const toggleMutation = useToggleCondominiumStatus({
    onSuccess: () => {
      toast.success(successMessage)
      setIsConfirmModalOpen(false)
      setPendingStatus(null)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message || errorMessage)
      setPendingStatus(null)
    },
  })

  const handleToggleClick = (newStatus: boolean) => {
    setPendingStatus(newStatus)
    setIsConfirmModalOpen(true)
  }

  const handleConfirm = () => {
    if (pendingStatus === null) return
    toggleMutation.mutate({
      condominiumId,
      isActive: pendingStatus,
    })
  }

  const handleCancel = () => {
    setIsConfirmModalOpen(false)
    setPendingStatus(null)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary-100 p-3">
            <Power className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <Typography variant="h4" className="mb-1">
              {title}
            </Typography>
            <Typography color="muted" variant="body2">
              {description}
            </Typography>
          </div>
        </div>
        <Switch
          isSelected={initialStatus}
          onValueChange={handleToggleClick}
          color="success"
          isDisabled={toggleMutation.isPending}
        />
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={handleCancel} size="md">
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">
              {pendingStatus ? activeLabel : inactiveLabel}
            </Typography>
          </ModalHeader>
          <ModalBody>
            <Typography color="muted" variant="body2">
              {pendingStatus
                ? '¿Está seguro de activar este condominio?'
                : '¿Está seguro de desactivar este condominio? Esto afectará a todos los usuarios y operaciones relacionadas.'}
            </Typography>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={handleCancel}
              isDisabled={toggleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              color={pendingStatus ? 'success' : 'warning'}
              onPress={handleConfirm}
              isLoading={toggleMutation.isPending}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
