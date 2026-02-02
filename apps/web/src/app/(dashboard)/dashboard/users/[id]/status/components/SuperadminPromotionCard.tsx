'use client'

import { useState } from 'react'
import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Checkbox } from '@/ui/components/checkbox'
import { useToast } from '@/ui/components/toast'
import { Shield, AlertTriangle } from 'lucide-react'
import {
  promoteUserToSuperadminAction,
  demoteUserFromSuperadminAction,
} from '../../actions'

interface IPermission {
  id: string
  name: string
  module: string
  action: string
  description?: string | null
}

interface SuperadminPromotionCardProps {
  userId: string
  userDisplayName: string
  isSuperadmin: boolean
  availablePermissions: IPermission[]
  currentPermissionIds: string[]
  promoteTitle: string
  promoteDescription: string
  demoteTitle: string
  demoteDescription: string
  promoteButtonText: string
  demoteButtonText: string
  modalTitle: string
  modalDescription: string
  selectAllText: string
  confirmButtonText: string
  cancelButtonText: string
  successMessage: string
  errorMessage: string
}

export function SuperadminPromotionCard({
  userId,
  userDisplayName,
  isSuperadmin,
  availablePermissions,
  currentPermissionIds,
  promoteTitle,
  promoteDescription,
  demoteTitle,
  demoteDescription,
  promoteButtonText,
  demoteButtonText,
  modalTitle,
  modalDescription,
  selectAllText,
  confirmButtonText,
  cancelButtonText,
  successMessage,
  errorMessage,
}: SuperadminPromotionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(currentPermissionIds)
  )
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  // Group permissions by module
  const permissionsByModule = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, IPermission[]>)

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedPermissions.size === availablePermissions.length) {
      setSelectedPermissions(new Set())
    } else {
      setSelectedPermissions(new Set(availablePermissions.map(p => p.id)))
    }
  }

  const handlePromote = async () => {
    if (selectedPermissions.size === 0) {
      toast.error('Debe seleccionar al menos un permiso')
      return
    }

    setIsLoading(true)
    try {
      const result = await promoteUserToSuperadminAction(
        userId,
        Array.from(selectedPermissions)
      )

      if (result.success) {
        toast.success(successMessage)
        setIsModalOpen(false)
      } else {
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemote = async () => {
    setIsLoading(true)
    try {
      const result = await demoteUserFromSuperadminAction(userId)

      if (result.success) {
        toast.success(successMessage)
      } else {
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuperadmin) {
    // Show demote option for superadmins
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-warning-100 p-3">
            <AlertTriangle className="h-6 w-6 text-warning-600" />
          </div>
          <div className="flex-1">
            <Typography variant="h4" className="mb-1">
              {demoteTitle}
            </Typography>
            <Typography color="muted" variant="body2" className="mb-4">
              {demoteDescription}
            </Typography>
            <Button
              color="warning"
              variant="flat"
              onPress={() => {
                if (
                  window.confirm(
                    `¿Está seguro de remover el rol de Superadmin a ${userDisplayName}?`
                  )
                ) {
                  handleDemote()
                }
              }}
              isLoading={isLoading}
            >
              {demoteButtonText}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Show promote option for non-superadmins
  return (
    <>
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary-100 p-3">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <Typography variant="h4" className="mb-1">
              {promoteTitle}
            </Typography>
            <Typography color="muted" variant="body2" className="mb-4">
              {promoteDescription}
            </Typography>
            <Button color="primary" onPress={() => setIsModalOpen(true)}>
              {promoteButtonText}
            </Button>
          </div>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">{modalTitle}</Typography>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Typography color="muted" variant="body2">
                {modalDescription}
              </Typography>

              {/* Select All Checkbox */}
              <div className="border-b border-default-200 pb-3">
                <Checkbox
                  isSelected={selectedPermissions.size === availablePermissions.length}
                  isIndeterminate={
                    selectedPermissions.size > 0 &&
                    selectedPermissions.size < availablePermissions.length
                  }
                  onValueChange={handleSelectAll}
                >
                  <Typography variant="body2" className="font-medium">
                    {selectAllText}
                  </Typography>
                </Checkbox>
              </div>

              {/* Permissions by Module */}
              <div className="max-h-96 overflow-y-auto space-y-4">
                {Object.entries(permissionsByModule).map(([module, permissions]) => (
                  <div key={module} className="space-y-2">
                    <Typography variant="subtitle2" className="font-semibold capitalize">
                      {module.replace(/_/g, ' ')}
                    </Typography>
                    <div className="space-y-2 pl-4">
                      {permissions.map(permission => (
                        <Checkbox
                          key={permission.id}
                          isSelected={selectedPermissions.has(permission.id)}
                          onValueChange={() => handleTogglePermission(permission.id)}
                        >
                          <div>
                            <Typography variant="body2">{permission.name}</Typography>
                            {permission.description && (
                              <Typography color="muted" variant="caption">
                                {permission.description}
                              </Typography>
                            )}
                          </div>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={() => setIsModalOpen(false)}>
              {cancelButtonText}
            </Button>
            <Button
              color="primary"
              onPress={handlePromote}
              isLoading={isLoading}
              isDisabled={selectedPermissions.size === 0}
            >
              {confirmButtonText}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
