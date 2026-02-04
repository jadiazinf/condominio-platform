'use client'

import { useState, useCallback, useMemo } from 'react'
import type { TUnit } from '@packages/domain'
import { Home, Plus, Edit2, Trash2 } from 'lucide-react'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import {
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { useRouter } from 'next/navigation'

import { UnitModal } from './UnitModal'
import { useDeleteUnit } from '@packages/http-client/hooks'

type TUnitRow = TUnit & { id: string }

interface IUnitsTableProps {
  units: TUnit[]
  buildingId: string
  translations: {
    title: string
    addUnit: string
    noUnits: string
    table: {
      number: string
      floor: string
      area: string
      bedrooms: string
      bathrooms: string
      parking: string
      status: string
      actions: string
    }
    status: {
      active: string
      inactive: string
    }
    modal: {
      createTitle: string
      editTitle: string
      cancel: string
      save: string
      saving: string
      form: {
        unitNumber: string
        unitNumberPlaceholder: string
        floor: string
        area: string
        bedrooms: string
        bathrooms: string
        parkingSpaces: string
        parkingIdentifiers: string
        parkingIdentifiersPlaceholder: string
        storageIdentifier: string
        aliquotPercentage: string
      }
      success: {
        created: string
        updated: string
      }
      error: {
        create: string
        update: string
      }
    }
    delete: {
      title: string
      confirm: string
      cancel: string
      delete: string
      deleting: string
      success: string
      error: string
    }
  }
  translateError?: (message: string | undefined) => string | undefined
}

export function UnitsTable({ units, buildingId, translations, translateError }: IUnitsTableProps) {
  const router = useRouter()
  const toast = useToast()
  const [selectedUnit, setSelectedUnit] = useState<TUnit | null>(null)
  const [unitToDelete, setUnitToDelete] = useState<TUnit | null>(null)

  const {
    isOpen: isCreateModalOpen,
    onOpen: onCreateModalOpen,
    onClose: onCreateModalClose,
  } = useDisclosure()

  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure()

  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure()

  const deleteMutation = useDeleteUnit({
    onSuccess: () => {
      toast.success(translations.delete.success)
      onDeleteModalClose()
      setUnitToDelete(null)
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.delete.error)
    },
  })

  const handleEdit = useCallback(
    (unit: TUnit) => {
      setSelectedUnit(unit)
      onEditModalOpen()
    },
    [onEditModalOpen]
  )

  const handleDelete = useCallback(
    (unit: TUnit) => {
      setUnitToDelete(unit)
      onDeleteModalOpen()
    },
    [onDeleteModalOpen]
  )

  const confirmDelete = useCallback(() => {
    if (unitToDelete) {
      deleteMutation.mutate({ unitId: unitToDelete.id })
    }
  }, [unitToDelete, deleteMutation])

  const columns: ITableColumn<TUnitRow>[] = useMemo(
    () => [
      { key: 'unitNumber', label: translations.table.number },
      { key: 'floor', label: translations.table.floor },
      { key: 'areaM2', label: translations.table.area },
      { key: 'bedrooms', label: translations.table.bedrooms },
      { key: 'bathrooms', label: translations.table.bathrooms },
      { key: 'parkingSpaces', label: translations.table.parking },
      { key: 'status', label: translations.table.status },
      { key: 'actions', label: translations.table.actions, align: 'end' },
    ],
    [translations.table]
  )

  const renderCell = useCallback(
    (unit: TUnit, columnKey: string) => {
      switch (columnKey) {
        case 'unitNumber':
          return (
            <div className="flex items-center gap-2">
              <Home className="text-primary" size={14} />
              <span className="font-medium">{unit.unitNumber}</span>
            </div>
          )
        case 'floor':
          return unit.floor ?? '-'
        case 'areaM2':
          return unit.areaM2 ? `${unit.areaM2} m²` : '-'
        case 'bedrooms':
          return unit.bedrooms ?? '-'
        case 'bathrooms':
          return unit.bathrooms ?? '-'
        case 'parkingSpaces':
          return unit.parkingSpaces ?? 0
        case 'status':
          return (
            <Chip color={unit.isActive ? 'success' : 'default'} variant="flat" size="sm">
              {unit.isActive ? translations.status.active : translations.status.inactive}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex items-center justify-end gap-1">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(unit)}>
                <Edit2 size={14} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => handleDelete(unit)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        default:
          return null
      }
    },
    [translations.status, handleEdit, handleDelete]
  )

  if (units.length === 0) {
    return (
      <div className="py-8 text-center">
        <Typography color="muted" variant="body2">
          {translations.noUnits}
        </Typography>
        <Button
          className="mt-4"
          color="primary"
          size="sm"
          startContent={<Plus size={14} />}
          onPress={onCreateModalOpen}
        >
          {translations.addUnit}
        </Button>

        <UnitModal
          isOpen={isCreateModalOpen}
          onClose={onCreateModalClose}
          buildingId={buildingId}
          translations={translations.modal}
          translateError={translateError}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="body2" color="muted">
          {translations.title} ({units.length})
        </Typography>
        <Button
          size="sm"
          color="primary"
          variant="flat"
          startContent={<Plus size={14} />}
          onPress={onCreateModalOpen}
        >
          {translations.addUnit}
        </Button>
      </div>

      <Table<TUnitRow>
        aria-label={translations.title}
        columns={columns}
        rows={units}
        renderCell={renderCell}
        classNames={{
          wrapper: 'shadow-none border',
          tr: 'hover:bg-default-50',
        }}
      />

      {/* Create Modal */}
      <UnitModal
        isOpen={isCreateModalOpen}
        onClose={onCreateModalClose}
        buildingId={buildingId}
        translations={translations.modal}
        translateError={translateError}
      />

      {/* Edit Modal */}
      <UnitModal
        isOpen={isEditModalOpen}
        onClose={() => {
          onEditModalClose()
          setSelectedUnit(null)
        }}
        buildingId={buildingId}
        unit={selectedUnit}
        translations={translations.modal}
        translateError={translateError}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="sm">
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">{translations.delete.title}</Typography>
          </ModalHeader>
          <ModalBody>
            <Typography variant="body2">
              {translations.delete.confirm} <strong>{unitToDelete?.unitNumber}</strong>?
            </Typography>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={onDeleteModalClose}
              isDisabled={deleteMutation.isPending}
            >
              {translations.delete.cancel}
            </Button>
            <Button color="danger" onPress={confirmDelete} isLoading={deleteMutation.isPending}>
              {deleteMutation.isPending ? translations.delete.deleting : translations.delete.delete}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
