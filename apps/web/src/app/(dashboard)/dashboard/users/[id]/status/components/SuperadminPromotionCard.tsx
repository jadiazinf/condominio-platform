'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { Switch } from '@/ui/components/switch'
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
  confirmButtonText,
  cancelButtonText,
  successMessage,
  errorMessage,
  noPermissionSelectedText,
  confirmDemoteText,
}: ISuperadminPromotionCardProps) {
  // demoteDescription is not used but kept in interface for potential future use
  const [isDemoteModalOpen, setIsDemoteModalOpen] = useState(false)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)

  // Track current permission states for visual display (updates on toggle)
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    if (isSuperadmin) {
      // If already superadmin, use current permissions
      currentPermissions.forEach(p => {
        initial[p.permissionId] = p.isEnabled
      })
    } else {
      // If not superadmin, initialize all permissions as false
      availablePermissions.forEach(p => {
        initial[p.id] = false
      })
    }
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
      setIsPermissionsModalOpen(false)
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


  // Transform permissions to PermissionsStep format
  // Works for both creating (using availablePermissions) and editing (using currentPermissions)
  const rolePermissions = useMemo(() => {
    if (isSuperadmin) {
      // Editing existing superadmin - use current permissions
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
          // Force using translated descriptions by setting description to undefined
          description: undefined,
          granted: p.isEnabled,
        })),
      }))
    } else {
      // Creating new superadmin - use available permissions
      const grouped: Record<string, IPermission[]> = {}
      availablePermissions.forEach(p => {
        if (!grouped[p.module]) {
          grouped[p.module] = []
        }
        grouped[p.module].push(p)
      })

      return Object.entries(grouped).map(([module, perms]) => ({
        module,
        permissions: perms.map(p => ({
          id: p.id,
          action: p.action,
          name: `admin.${module.toLowerCase()}.${p.action.toLowerCase()}`,
          // Force using translated descriptions by setting description to undefined
          description: undefined,
          granted: false,
        })),
      }))
    }
  }, [isSuperadmin, currentPermissions, availablePermissions])

  const handleDemote = () => {
    demoteMutation.mutate({ userId })
  }

  // Toggle permission visually (updates local state, no API call)
  // Works for both creating and editing superadmin
  const handleTogglePermission = useCallback(
    (permissionId: string) => {
      if (isSuperadmin && isOwnProfile) return

      setCustomPermissions(prev => ({
        ...prev,
        [permissionId]: !prev[permissionId],
      }))
    },
    [isSuperadmin, isOwnProfile]
  )

  // Toggle all permissions in a module
  const handleToggleModule = useCallback(
    (permissionIds: string[]) => {
      if (isSuperadmin && isOwnProfile) return

      // Check if all permissions in the module are currently selected
      const allSelected = permissionIds.every(id => customPermissions[id])
      const newValue = !allSelected

      setCustomPermissions(prev => {
        const updated = { ...prev }
        permissionIds.forEach(id => {
          updated[id] = newValue
        })
        return updated
      })
    },
    [isSuperadmin, isOwnProfile, customPermissions]
  )

  // Calculate which permissions have changed from their original state
  const changedPermissions = useMemo(() => {
    if (isSuperadmin) {
      // For existing superadmin, calculate changes from server state
      const changes: Array<{ permissionId: string; isEnabled: boolean }> = []
      currentPermissions.forEach(p => {
        const currentValue = customPermissions[p.permissionId]
        if (currentValue !== undefined && currentValue !== p.isEnabled) {
          changes.push({ permissionId: p.permissionId, isEnabled: currentValue })
        }
      })
      return changes
    } else {
      // For new superadmin, get all selected permissions
      return Object.entries(customPermissions)
        .filter(([_, isEnabled]) => isEnabled)
        .map(([permissionId, _]) => ({ permissionId, isEnabled: true }))
    }
  }, [isSuperadmin, currentPermissions, customPermissions])

  const hasChanges = changedPermissions.length > 0

  // Save permissions - uses different mutation based on context
  const handleSavePermissions = useCallback(() => {
    if (!hasChanges) return
    if (isSuperadmin && isOwnProfile) return

    if (isSuperadmin) {
      // Update existing superadmin permissions
      batchToggleMutation.mutate({
        userId,
        changes: changedPermissions,
      })
    } else {
      // Promote to superadmin with selected permissions
      const permissionIds = changedPermissions.map(c => c.permissionId)
      if (permissionIds.length === 0) {
        toast.error(noPermissionSelectedText)
        return
      }
      promoteMutation.mutate({
        userId,
        permissionIds,
      })
    }
  }, [isSuperadmin, hasChanges, isOwnProfile, changedPermissions, userId, batchToggleMutation, promoteMutation, toast, noPermissionSelectedText])

  // Reset to original state when modal closes
  const handleClosePermissionsModal = useCallback(() => {
    setIsPermissionsModalOpen(false)
    // Reset customPermissions to original state
    const original: Record<string, boolean> = {}
    if (isSuperadmin) {
      currentPermissions.forEach(p => {
        original[p.permissionId] = p.isEnabled
      })
    } else {
      availablePermissions.forEach(p => {
        original[p.id] = false
      })
    }
    setCustomPermissions(original)
  }, [isSuperadmin, currentPermissions, availablePermissions])

  // Count enabled permissions (always from server state)
  const enabledCount = currentPermissions.filter(p => p.isEnabled).length

  // Calculate total permissions and selected count
  const totalPermissions = useMemo(() => {
    return rolePermissions.reduce((count, module) => count + module.permissions.length, 0)
  }, [rolePermissions])

  const selectedCount = useMemo(() => {
    return Object.values(customPermissions).filter(Boolean).length
  }, [customPermissions])

  const areAllSelected = selectedCount === totalPermissions && totalPermissions > 0

  // Toggle all permissions
  const handleToggleAll = useCallback(() => {
    if (isSuperadmin && isOwnProfile) return

    const newValue = !areAllSelected
    const updated: Record<string, boolean> = {}

    rolePermissions.forEach(module => {
      module.permissions.forEach(permission => {
        updated[permission.id] = newValue
      })
    })

    setCustomPermissions(updated)
  }, [areAllSelected, rolePermissions, isSuperadmin, isOwnProfile])

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

        {/* Permissions Modal - Used for both editing and creating */}
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
              {isSuperadmin && isOwnProfile && (
                <Card className="p-4 bg-warning-50 border border-warning-200 mb-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0" />
                    <Typography color="warning" variant="body2">
                      {t('superadmin.users.detail.permissions.cannotModifyOwn') || 'No puedes modificar tus propios permisos'}
                    </Typography>
                  </div>
                </Card>
              )}

              {/* Toggle All Switch */}
              <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg mb-4">
                <div className="flex-1">
                  <Typography variant="subtitle2" className="font-medium">
                    {areAllSelected
                      ? (t('superadmin.users.detail.statusSection.deselectAllPermissions') || 'Deseleccionar todos los permisos')
                      : (t('superadmin.users.detail.statusSection.selectAllPermissions') || 'Seleccionar todos los permisos')
                    }
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {selectedCount} / {totalPermissions} {t('superadmin.users.detail.statusSection.permissionsSelected') || 'permisos seleccionados'}
                  </Typography>
                </div>
                <Switch
                  isSelected={areAllSelected}
                  onValueChange={handleToggleAll}
                  color="primary"
                  isDisabled={isSuperadmin && isOwnProfile}
                />
              </div>

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
                onTogglePermission={handleTogglePermission}
                onToggleModule={handleToggleModule}
                isLoading={batchToggleMutation.isPending || promoteMutation.isPending}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                variant="bordered"
                onPress={handleClosePermissionsModal}
                isDisabled={batchToggleMutation.isPending || promoteMutation.isPending}
              >
                {t('common.cancel') || 'Cancelar'}
              </Button>
              <Button
                color="primary"
                onPress={handleSavePermissions}
                isLoading={batchToggleMutation.isPending || promoteMutation.isPending}
                isDisabled={!hasChanges || (isSuperadmin && isOwnProfile)}
                startContent={!(batchToggleMutation.isPending || promoteMutation.isPending) && <Save className="h-4 w-4" />}
              >
                {isSuperadmin ? (t('common.save') || 'Guardar') : (confirmButtonText || 'Confirmar')}
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
            <Button color="primary" onPress={() => setIsPermissionsModalOpen(true)}>
              {promoteButtonText}
            </Button>
          </div>
        </div>
      </Card>

      {/* Permissions Modal - Same as the one used for editing */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={handleClosePermissionsModal}
        size="3xl"
      >
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">
              {modalTitle}
            </Typography>
          </ModalHeader>
          <ModalBody>
            <Typography color="muted" variant="body2" className="mb-4">
              {modalDescription}
            </Typography>

            {/* Toggle All Switch */}
            <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg mb-4">
              <div className="flex-1">
                <Typography variant="subtitle2" className="font-medium">
                  {areAllSelected
                    ? (t('superadmin.users.detail.statusSection.deselectAllPermissions') || 'Deseleccionar todos los permisos')
                    : (t('superadmin.users.detail.statusSection.selectAllPermissions') || 'Seleccionar todos los permisos')
                  }
                </Typography>
                <Typography variant="caption" color="muted">
                  {selectedCount} / {totalPermissions} {t('superadmin.users.detail.statusSection.permissionsSelected') || 'permisos seleccionados'}
                </Typography>
              </div>
              <Switch
                isSelected={areAllSelected}
                onValueChange={handleToggleAll}
                color="primary"
              />
            </div>

            {/* Show pending changes count */}
            {hasChanges && (
              <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <Typography variant="body2" color="primary">
                  {changedPermissions.length} {t('superadmin.users.detail.statusSection.permissionsSelected') || 'permisos seleccionados'}
                </Typography>
              </div>
            )}
            <PermissionsStep
              rolePermissions={rolePermissions}
              customPermissions={customPermissions}
              onTogglePermission={handleTogglePermission}
              onToggleModule={handleToggleModule}
              isLoading={promoteMutation.isPending}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={handleClosePermissionsModal}
              isDisabled={promoteMutation.isPending}
            >
              {cancelButtonText}
            </Button>
            <Button
              color="primary"
              onPress={handleSavePermissions}
              isLoading={promoteMutation.isPending}
              isDisabled={!hasChanges}
              startContent={!promoteMutation.isPending && <Save className="h-4 w-4" />}
            >
              {confirmButtonText}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
