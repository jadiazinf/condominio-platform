'use client'

import type { TAmenity } from '@packages/domain'

import { useState, useCallback } from 'react'
import { Building2, Plus, Pencil, Trash2, MapPin, Users, ShieldCheck } from 'lucide-react'
import {
  useAmenitiesByCondominium,
  useCreateAmenity,
  useUpdateAmenity,
  useDeleteAmenity,
} from '@packages/http-client'

import { Card, CardBody, CardFooter, CardHeader } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Typography } from '@/ui/components/typography'
import { Input } from '@/ui/components/input'
import { Switch } from '@/ui/components/switch'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { useTranslation, useCondominium } from '@/contexts'
import { useToast } from '@/ui/components/toast'

type TAmenityFormData = {
  name: string
  description: string
  location: string
  capacity: string
  requiresApproval: boolean
}

const INITIAL_FORM_DATA: TAmenityFormData = {
  name: '',
  description: '',
  location: '',
  capacity: '',
  requiresApproval: false,
}

export function AmenitiesClient() {
  const { t } = useTranslation()
  const { selectedCondominium } = useCondominium()
  const toast = useToast()

  const condominiumId = selectedCondominium?.condominium?.id ?? ''

  // Form state
  const [formData, setFormData] = useState<TAmenityFormData>(INITIAL_FORM_DATA)
  const [editingAmenity, setEditingAmenity] = useState<TAmenity | null>(null)
  const [deletingAmenity, setDeletingAmenity] = useState<TAmenity | null>(null)

  // Modal state
  const formModal = useDisclosure()
  const deleteModal = useDisclosure()

  // Fetch amenities for the selected condominium
  const { data, isLoading, error, refetch } = useAmenitiesByCondominium(condominiumId, {
    enabled: !!condominiumId,
  })

  const amenities = data?.data ?? []

  // Mutations
  const createMutation = useCreateAmenity({
    onSuccess: () => {
      toast.success(t('admin.amenities.saveSuccess'))
      formModal.onClose()
      resetForm()
    },
    onError: () => {
      toast.error(t('common.error'))
    },
  })

  const updateMutation = useUpdateAmenity(editingAmenity?.id ?? '', {
    onSuccess: () => {
      toast.success(t('admin.amenities.saveSuccess'))
      formModal.onClose()
      resetForm()
    },
    onError: () => {
      toast.error(t('common.error'))
    },
  })

  const deleteMutation = useDeleteAmenity({
    onSuccess: () => {
      toast.success(t('admin.amenities.deleteSuccess'))
      deleteModal.onClose()
      setDeletingAmenity(null)
    },
    onError: () => {
      toast.error(t('common.error'))
    },
  })

  // Handlers
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setEditingAmenity(null)
  }, [])

  const handleAdd = useCallback(() => {
    resetForm()
    formModal.onOpen()
  }, [resetForm, formModal])

  const handleEdit = useCallback(
    (amenity: TAmenity) => {
      setEditingAmenity(amenity)
      setFormData({
        name: amenity.name,
        description: amenity.description ?? '',
        location: amenity.location ?? '',
        capacity: amenity.capacity != null ? String(amenity.capacity) : '',
        requiresApproval: amenity.requiresApproval,
      })
      formModal.onOpen()
    },
    [formModal]
  )

  const handleDeleteConfirm = useCallback(
    (amenity: TAmenity) => {
      setDeletingAmenity(amenity)
      deleteModal.onOpen()
    },
    [deleteModal]
  )

  const handleSubmit = useCallback(() => {
    const payload = {
      condominiumId,
      name: formData.name,
      description: formData.description || null,
      location: formData.location || null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      requiresApproval: formData.requiresApproval,
      reservationRules: null,
      isActive: true,
      metadata: null,
      createdBy: null,
    }

    if (editingAmenity) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }, [formData, condominiumId, editingAmenity, createMutation, updateMutation])

  const handleDelete = useCallback(() => {
    if (deletingAmenity) {
      deleteMutation.mutate({ id: deletingAmenity.id })
    }
  }, [deletingAmenity, deleteMutation])

  const isSaving = createMutation.isPending || updateMutation.isPending

  // No condominium selected
  if (!condominiumId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <Building2 className="mb-4 text-default-300" size={48} />
        <Typography color="muted" variant="body1">
          {t('admin.amenities.noAmenities')}
        </Typography>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('common.loadError')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-end">
        <Button color="primary" startContent={<Plus size={16} />} onPress={handleAdd}>
          {t('admin.amenities.add')}
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : amenities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Building2 className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('admin.amenities.noAmenities')}
          </Typography>
        </div>
      ) : (
        /* Amenities Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map(amenity => (
            <Card key={amenity.id} shadow="sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0 flex-1">
                  <Typography className="truncate" variant="h4">
                    {amenity.name}
                  </Typography>
                </div>
                {amenity.requiresApproval && (
                  <Chip color="warning" size="sm" variant="flat">
                    <div className="flex items-center gap-1">
                      <ShieldCheck size={12} />
                      {t('admin.amenities.requiresApproval')}
                    </div>
                  </Chip>
                )}
              </CardHeader>
              <CardBody className="gap-2 py-2">
                {amenity.description && (
                  <Typography className="line-clamp-2" color="muted" variant="body2">
                    {amenity.description}
                  </Typography>
                )}
                <div className="flex flex-col gap-1">
                  {amenity.location && (
                    <div className="flex items-center gap-2 text-sm text-default-500">
                      <MapPin size={14} />
                      <span>{amenity.location}</span>
                    </div>
                  )}
                  {amenity.capacity != null && (
                    <div className="flex items-center gap-2 text-sm text-default-500">
                      <Users size={14} />
                      <span>
                        {t('admin.amenities.capacity')}: {amenity.capacity}
                      </span>
                    </div>
                  )}
                </div>
              </CardBody>
              <CardFooter className="justify-end gap-2 pt-2">
                <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(amenity)}>
                  <Pencil size={16} />
                </Button>
                <Button
                  isIconOnly
                  color="danger"
                  size="sm"
                  variant="light"
                  onPress={() => handleDeleteConfirm(amenity)}
                >
                  <Trash2 size={16} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={formModal.isOpen} size="lg" onOpenChange={formModal.onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader>
                {editingAmenity ? t('common.edit') : t('admin.amenities.add')}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    isRequired
                    label={t('admin.amenities.name')}
                    placeholder={t('admin.amenities.name')}
                    value={formData.name}
                    variant="bordered"
                    onValueChange={value => setFormData(prev => ({ ...prev, name: value }))}
                  />
                  <Input
                    label={t('admin.amenities.description')}
                    placeholder={t('admin.amenities.description')}
                    value={formData.description}
                    variant="bordered"
                    onValueChange={value => setFormData(prev => ({ ...prev, description: value }))}
                  />
                  <Input
                    label={t('admin.amenities.location')}
                    placeholder={t('admin.amenities.location')}
                    value={formData.location}
                    variant="bordered"
                    onValueChange={value => setFormData(prev => ({ ...prev, location: value }))}
                  />
                  <Input
                    label={t('admin.amenities.capacity')}
                    placeholder={t('admin.amenities.capacity')}
                    type="number"
                    value={formData.capacity}
                    variant="bordered"
                    onValueChange={value => setFormData(prev => ({ ...prev, capacity: value }))}
                  />
                  <div className="flex items-center gap-3">
                    <Switch
                      isSelected={formData.requiresApproval}
                      onValueChange={value =>
                        setFormData(prev => ({ ...prev, requiresApproval: value }))
                      }
                    />
                    <Typography variant="body2">{t('admin.amenities.requiresApproval')}</Typography>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  color="primary"
                  isDisabled={!formData.name.trim()}
                  isLoading={isSaving}
                  onPress={handleSubmit}
                >
                  {t('common.save')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} size="sm" onOpenChange={deleteModal.onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader>{t('common.confirm')}</ModalHeader>
              <ModalBody>
                <Typography variant="body1">
                  {t('common.delete')} &quot;{deletingAmenity?.name}&quot;?
                </Typography>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button color="danger" isLoading={deleteMutation.isPending} onPress={handleDelete}>
                  {t('common.delete')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
