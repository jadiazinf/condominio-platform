'use client'

import type { TUnit } from '@packages/domain'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Plus, Power } from 'lucide-react'
import { useToggleUnitStatus } from '@packages/http-client/hooks'

import { UnitModal } from './UnitModal'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useDisclosure } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'

type TUnitRow = TUnit & { id: string }

interface IUnitsTableProps {
  units: TUnit[]
  buildingId: string
  condominiumId: string
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
    statusToggle: {
      success: string
      error: string
    }
  }
  translateError?: (message: string | undefined) => string | undefined
}

export function UnitsTable({
  units,
  buildingId,
  condominiumId,
  translations,
  translateError,
}: IUnitsTableProps) {
  const router = useRouter()
  const toast = useToast()

  const {
    isOpen: isCreateModalOpen,
    onOpen: onCreateModalOpen,
    onClose: onCreateModalClose,
  } = useDisclosure()

  const toggleStatusMutation = useToggleUnitStatus({
    onSuccess: () => {
      toast.success(translations.statusToggle.success)
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.statusToggle.error)
    },
  })

  const handleToggleStatus = useCallback(
    (unit: TUnit) => {
      toggleStatusMutation.mutate({
        unitId: unit.id,
        isActive: !unit.isActive,
      })
    },
    [toggleStatusMutation]
  )

  const handleRowClick = useCallback(
    (unit: TUnit) => {
      router.push(
        `/dashboard/condominiums/${condominiumId}/buildings/${buildingId}/units/${unit.id}`
      )
    },
    [router, condominiumId, buildingId]
  )

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
            <Chip color={unit.isActive ? 'success' : 'default'} size="sm" variant="flat">
              {unit.isActive ? translations.status.active : translations.status.inactive}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                isIconOnly
                isDisabled={toggleStatusMutation.isPending}
                size="sm"
                variant="light"
                onPress={() => handleToggleStatus(unit)}
              >
                <Power className={unit.isActive ? 'text-success' : 'text-default-400'} size={14} />
              </Button>
            </div>
          )
        default:
          return null
      }
    },
    [translations.status, handleToggleStatus, toggleStatusMutation.isPending]
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
          buildingId={buildingId}
          isOpen={isCreateModalOpen}
          translateError={translateError}
          translations={translations.modal}
          onClose={onCreateModalClose}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography color="muted" variant="body2">
          {translations.title} ({units.length})
        </Typography>
        <Button
          color="primary"
          size="sm"
          startContent={<Plus size={14} />}
          variant="flat"
          onPress={onCreateModalOpen}
        >
          {translations.addUnit}
        </Button>
      </div>

      <Table<TUnitRow>
        aria-label={translations.title}
        classNames={{
          wrapper: 'shadow-none border',
          tr: 'hover:bg-default-50',
        }}
        columns={columns}
        renderCell={renderCell}
        rows={units}
        onRowClick={handleRowClick}
      />

      {/* Create Modal */}
      <UnitModal
        buildingId={buildingId}
        isOpen={isCreateModalOpen}
        translateError={translateError}
        translations={translations.modal}
        onClose={onCreateModalClose}
      />
    </div>
  )
}
