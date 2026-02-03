'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Checkbox } from '@/ui/components/checkbox'
import { useToast } from '@/ui/components/toast'
import { Shield, AlertTriangle, Settings, Save } from 'lucide-react'
import { useTranslation } from '@/contexts'
import {
  usePromoteToSuperadmin,
  useDemoteFromSuperadmin,
  useBatchToggleUserPermissions,
} from '@packages/http-client/hooks'
import { PermissionsStep } from '../../../new/components/PermissionsStep'

interface IPermission {
  id: string
  name: string
  module: string
  action: string
  description?: string | null
}

interface ISuperadminPermission {
  id: string
  permissionId: string
  module: string
  action: string
  description: string | null
  isEnabled: boolean
}

interface ISuperadminPromotionCardProps {
  userId: string
  currentUserId?: string
  userDisplayName: string
  isSuperadmin: boolean
  availablePermissions: IPermission[]
  currentPermissions?: ISuperadminPermission[]
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
  noPermissionSelectedText: string
  confirmDemoteText: string
}

export function SuperadminPromotionCard({
  userId,
  currentUserId,
  userDisplayName,
  isSuperadmin,
  availablePermissions,
  currentPermissions = [],
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
  noPermissionSelectedText,
  confirmDemoteText,
}: ISuperadminPromotionCardProps) {
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false)
  const [isDemoteModalOpen, setIsDemoteModalOpen] = useState(false)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(currentPermissions.filter(p => p.isEnabled).map(p => p.permissionId))
  )
  // Track current permission states for visual display (updates on toggle)
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    currentPermissions.forEach(p => {
      initial[p.permissionId] = p.isEnabled
    })
    return initial
  })

  const toast = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const isOwnProfile = currentUserId === userId

  // Mutation hooks
  const promoteMutation = usePromoteToSuperadmin({
    onSuccess: (response) => {
      toast.success(response.data.message || successMessage)
      setIsPromoteModalOpen(false)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message || errorMessage)
    },
  })

  const demoteMutation = useDemoteFromSuperadmin({
    onSuccess: (response) => {
      toast.success(response.data.message || successMessage)
      setIsDemoteModalOpen(false)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message || errorMessage)
    },
  })

  const batchToggleMutation = useBatchToggleUserPermissions({
    onSuccess: (response) => {
      toast.success(response.data.message || t('superadmin.users.detail.statusSection.permissionsSaved') || 'Permisos actualizados correctamente')
      setIsPermissionsModalOpen(false)
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message || t('superadmin.users.detail.statusSection.permissionsSaveError') || 'Error al actualizar permisos')
    },
  })

  // Helper to get module display name with translation
  const getModuleLabel = (module: string) => {
    const translationKey = `superadmin.users.create.permissionModules.${module.toLowerCase()}`
    const translated = t(translationKey)
    if (translated && translated !== translationKey) {
      return translated
    }
    return module
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper to get action display name with translation
  const getActionLabel = (action: string) => {
    const translationKey = `superadmin.users.create.permissionActions.${action.toLowerCase()}`
    const translated = t(translationKey)
    if (translated && translated !== translationKey) {
      return translated
    }
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper to get translated permission description
  const getPermissionDescription = (permission: IPermission) => {
    const moduleLabel = getModuleLabel(permission.module)
    const actionLabel = getActionLabel(permission.action)
    return `${actionLabel} ${moduleLabel.toLowerCase()}`
  }

  // Group available permissions by module (for promotion)
  const permissionsByModule = availablePermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push(permission)
      return acc
    },
    {} as Record<string, IPermission[]>
  )

  // Transform current permissions to PermissionsStep format (for editing)
  const rolePermissions = useMemo(() => {
    const grouped: Record<string, ISuperadminPermission[]> = {}
    currentPermissions.forEach(p => {
      if (!grouped[p.module]) {
        grouped[p.module] = []
      }
      grouped[p.module].push(p)
    })

    return Object.entries(grouped).map(([module, perms]) => ({
      module,
      permissions: perms.map(p => ({
        id: p.permissionId,
        action: p.action,
        name: `admin.${module.toLowerCase()}.${p.action.toLowerCase()}`,
        description: p.description || undefined,
        granted: p.isEnabled,
      })),
    }))
  }, [currentPermissions])

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

  const handlePromote = () => {
    if (selectedPermissions.size === 0) {
      toast.error(noPermissionSelectedText)
      return
    }
    promoteMutation.mutate({
      userId,
      permissionIds: Array.from(selectedPermissions),
    })
  }

  const handleDemote = () => {
    demoteMutation.mutate({ userId })
  }

  // Toggle permission visually (updates local state, no API call)
  const handleToggleExistingPermission = useCallback(
    (permissionId: string) => {
      if (isOwnProfile) return

      setCustomPermissions(prev => ({
        ...prev,
        [permissionId]: !prev[permissionId],
      }))
    },
    [isOwnProfile]
  )

  // Calculate which permissions have changed from their original server state
  const changedPermissions = useMemo(() => {
    const changes: Array<{ permissionId: string; isEnabled: boolean }> = []
    currentPermissions.forEach(p => {
      const currentValue = customPermissions[p.permissionId]
      if (currentValue !== undefined && currentValue !== p.isEnabled) {
        changes.push({ permissionId: p.permissionId, isEnabled: currentValue })
      }
    })
    return changes
  }, [currentPermissions, customPermissions])

  const hasChanges = changedPermissions.length > 0

  // Save all permission changes in a single batch request
  const handleSavePermissions = useCallback(() => {
    if (!hasChanges || isOwnProfile) return

    batchToggleMutation.mutate({
      userId,
      changes: changedPermissions,
    })
  }, [hasChanges, isOwnProfile, changedPermissions, userId, batchToggleMutation])

  // Reset to original server state when modal closes
  const handleClosePermissionsModal = useCallback(() => {
    setIsPermissionsModalOpen(false)
    // Reset customPermissions to original server state
    const original: Record<string, boolean> = {}
    currentPermissions.forEach(p => {
      original[p.permissionId] = p.isEnabled
    })
    setCustomPermissions(original)
  }, [currentPermissions])

  // Count enabled permissions (always from server state)
  const enabledCount = currentPermissions.filter(p => p.isEnabled).length

  if (isSuperadmin) {
    // Show superadmin management card
    return (
      <>
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary-100 p-3">
              <Shield className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <Typography variant="h4" className="mb-1">
                {t('superadmin.users.detail.statusSection.superadminStatus') || 'Estado de Superadmin'}
              </Typography>
              <Typography color="muted" variant="body2" className="mb-4">
                {t('superadmin.users.detail.statusSection.superadminDescription') || 'Este usuario tiene privilegios de superadministrador'}
              </Typography>

              {/* Permission count */}
              {currentPermissions.length > 0 && (
                <Typography variant="body2" color="muted" className="mb-4">
                  {enabledCount} / {currentPermissions.length} {t('superadmin.users.detail.statusSection.permissionsEnabled') || 'permisos activos'}
                </Typography>
              )}

              <div className="flex flex-wrap gap-3">
                {/* Edit Permissions Button */}
                {currentPermissions.length > 0 && (
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={() => setIsPermissionsModalOpen(true)}
                    startContent={<Settings className="h-4 w-4" />}
                  >
                    {t('superadmin.users.detail.statusSection.editPermissions') || 'Editar permisos'}
                  </Button>
                )}

                {/* Demote Button */}
                <Button
                  color="warning"
                  variant="flat"
                  onPress={() => setIsDemoteModalOpen(true)}
                  isLoading={demoteMutation.isPending}
                  startContent={<AlertTriangle className="h-4 w-4" />}
                >
                  {demoteButtonText}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Permissions Modal */}
        <Modal
          isOpen={isPermissionsModalOpen}
          onClose={handleClosePermissionsModal}
          size="3xl"
        >
          <ModalContent>
            <ModalHeader>
              <Typography variant="h4">
                {t('superadmin.users.detail.statusSection.editPermissionsTitle') || 'Editar permisos de Superadmin'}
              </Typography>
            </ModalHeader>
            <ModalBody>
              {isOwnProfile && (
                <Card className="p-4 bg-warning-50 border border-warning-200 mb-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0" />
                    <Typography color="warning" variant="body2">
                      {t('superadmin.users.detail.permissions.cannotModifyOwn') || 'No puedes modificar tus propios permisos'}
                    </Typography>
                  </div>
                </Card>
              )}
              {/* Show pending changes count */}
              {hasChanges && (
                <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <Typography variant="body2" color="primary">
                    {changedPermissions.length} {t('superadmin.users.detail.statusSection.pendingChanges') || 'cambios pendientes'}
                  </Typography>
                </div>
              )}
              <PermissionsStep
                rolePermissions={rolePermissions}
                customPermissions={customPermissions}
                onTogglePermission={handleToggleExistingPermission}
                isLoading={batchToggleMutation.isPending}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="bordered" onPress={handleClosePermissionsModal} isDisabled={batchToggleMutation.isPending}>
                {t('common.cancel') || 'Cancelar'}
              </Button>
              <Button
                color="primary"
                onPress={handleSavePermissions}
                isLoading={batchToggleMutation.isPending}
                isDisabled={!hasChanges || isOwnProfile}
                startContent={!batchToggleMutation.isPending && <Save className="h-4 w-4" />}
              >
                {t('common.save') || 'Guardar'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Demote Confirmation Modal */}
        <Modal isOpen={isDemoteModalOpen} onClose={() => setIsDemoteModalOpen(false)} size="md">
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-warning-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                </div>
                <Typography variant="h4">{demoteTitle}</Typography>
              </div>
            </ModalHeader>
            <ModalBody>
              <Typography color="muted" variant="body2">
                {confirmDemoteText.replace('{name}', userDisplayName)}
              </Typography>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="bordered"
                onPress={() => setIsDemoteModalOpen(false)}
                isDisabled={demoteMutation.isPending}
              >
                {cancelButtonText}
              </Button>
              <Button
                color="warning"
                onPress={handleDemote}
                isLoading={demoteMutation.isPending}
              >
                {demoteButtonText}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
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
            <Button color="primary" onPress={() => setIsPromoteModalOpen(true)}>
              {promoteButtonText}
            </Button>
          </div>
        </div>
      </Card>

      <Modal isOpen={isPromoteModalOpen} onClose={() => setIsPromoteModalOpen(false)} size="2xl">
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
                    <Typography variant="subtitle2" className="font-semibold">
                      {getModuleLabel(module)}
                    </Typography>
                    <div className="space-y-2 pl-4">
                      {permissions.map(permission => (
                        <Checkbox
                          key={permission.id}
                          isSelected={selectedPermissions.has(permission.id)}
                          onValueChange={() => handleTogglePermission(permission.id)}
                        >
                          <div>
                            <Typography variant="body2">
                              {getActionLabel(permission.action)}
                            </Typography>
                            <Typography color="muted" variant="caption">
                              {getPermissionDescription(permission)}
                            </Typography>
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
            <Button
              variant="bordered"
              onPress={() => setIsPromoteModalOpen(false)}
              isDisabled={promoteMutation.isPending}
            >
              {cancelButtonText}
            </Button>
            <Button
              color="primary"
              onPress={handlePromote}
              isLoading={promoteMutation.isPending}
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
