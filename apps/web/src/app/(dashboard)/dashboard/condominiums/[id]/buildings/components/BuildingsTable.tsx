'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { TBuilding, TUnit } from '@packages/domain'
import { Building2, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Power } from 'lucide-react'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { useDisclosure } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'

import { BuildingModal } from './BuildingModal'
import { DeleteBuildingModal } from './DeleteBuildingModal'
import { UnitsTable } from './UnitsTable'
import { useBuildingUnits, useToggleBuildingStatus } from '@packages/http-client/hooks'

type TBuildingRow = TBuilding & { id: string }

interface IBuildingsTableProps {
  buildings: TBuilding[]
  condominiumId: string
  token: string
  translations: {
    addBuilding: string
    noBuildings: string
    noBuildingsDescription: string
    table: {
      name: string
      code: string
      floors: string
      units: string
      status: string
      actions: string
    }
    status: {
      active: string
      inactive: string
    }
    buildingModal: {
      createTitle: string
      editTitle: string
      cancel: string
      save: string
      saving: string
      form: {
        name: string
        namePlaceholder: string
        code: string
        codePlaceholder: string
        address: string
        addressPlaceholder: string
        floors: string
        bankInfo: string
        bankAccountHolder: string
        bankName: string
        bankAccountNumber: string
        bankAccountType: string
        accountTypes: {
          corriente: string
          ahorro: string
        }
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
    deleteModal: {
      title: string
      confirm: string
      warning: string
      cancel: string
      delete: string
      deleting: string
      success: string
      error: string
    }
    statusToggle: {
      success: string
      error: string
    }
    units: {
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
  }
  translateError?: (message: string | undefined) => string | undefined
}

function ExpandedBuildingRow({
  building,
  token,
  translations,
  translateError,
}: {
  building: TBuilding
  token: string
  translations: IBuildingsTableProps['translations']['units']
  translateError?: (message: string | undefined) => string | undefined
}) {
  const { data, isLoading } = useBuildingUnits({
    token,
    buildingId: building.id,
    enabled: true,
  })

  const units = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div className="bg-default-50 p-4">
      <UnitsTable
        units={units}
        buildingId={building.id}
        translations={translations}
        translateError={translateError}
      />
    </div>
  )
}

export function BuildingsTable({
  buildings,
  condominiumId,
  token,
  translations,
  translateError,
}: IBuildingsTableProps) {
  const router = useRouter()
  const toast = useToast()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedBuilding, setSelectedBuilding] = useState<TBuilding | null>(null)
  const [buildingToDelete, setBuildingToDelete] = useState<TBuilding | null>(null)

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

  const toggleStatusMutation = useToggleBuildingStatus({
    onSuccess: () => {
      toast.success(translations.statusToggle.success)
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.statusToggle.error)
    },
  })

  const toggleRow = useCallback((buildingId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(buildingId)) {
        next.delete(buildingId)
      } else {
        next.add(buildingId)
      }
      return next
    })
  }, [])

  const handleEdit = useCallback(
    (building: TBuilding) => {
      setSelectedBuilding(building)
      onEditModalOpen()
    },
    [onEditModalOpen]
  )

  const handleDelete = useCallback(
    (building: TBuilding) => {
      setBuildingToDelete(building)
      onDeleteModalOpen()
    },
    [onDeleteModalOpen]
  )

  const handleToggleStatus = useCallback(
    (building: TBuilding) => {
      toggleStatusMutation.mutate({
        buildingId: building.id,
        isActive: !building.isActive,
      })
    },
    [toggleStatusMutation]
  )

  const columns: ITableColumn<TBuildingRow>[] = useMemo(
    () => [
      { key: 'expand', label: '', width: 40 },
      { key: 'name', label: translations.table.name },
      { key: 'code', label: translations.table.code },
      { key: 'floors', label: translations.table.floors },
      { key: 'units', label: translations.table.units },
      { key: 'status', label: translations.table.status },
      { key: 'actions', label: translations.table.actions, align: 'end' },
    ],
    [translations.table]
  )

  const renderCell = useCallback(
    (building: TBuilding, columnKey: string) => {
      const isExpanded = expandedRows.has(building.id)

      switch (columnKey) {
        case 'expand':
          return (
            <Button isIconOnly size="sm" variant="light" onPress={() => toggleRow(building.id)}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          )
        case 'name':
          return (
            <div className="flex items-center gap-2">
              <Building2 className="text-primary" size={16} />
              <div>
                <span className="font-medium">{building.name}</span>
                {building.address && (
                  <p className="text-xs text-default-500 truncate max-w-[200px]">
                    {building.address}
                  </p>
                )}
              </div>
            </div>
          )
        case 'code':
          return building.code || '-'
        case 'floors':
          return building.floorsCount ?? '-'
        case 'units':
          return building.unitsCount ?? '-'
        case 'status':
          return (
            <Chip color={building.isActive ? 'success' : 'default'} variant="flat" size="sm">
              {building.isActive ? translations.status.active : translations.status.inactive}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => handleToggleStatus(building)}
                isDisabled={toggleStatusMutation.isPending}
              >
                <Power
                  size={14}
                  className={building.isActive ? 'text-success' : 'text-default-400'}
                />
              </Button>
              <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(building)}>
                <Edit2 size={14} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => handleDelete(building)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        default:
          return null
      }
    },
    [
      expandedRows,
      translations.status,
      toggleRow,
      handleEdit,
      handleDelete,
      handleToggleStatus,
      toggleStatusMutation.isPending,
    ]
  )

  // Empty state
  if (buildings.length === 0) {
    return (
      <>
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Building2 className="mb-4 text-default-300" size={48} />
            <Typography variant="h4" className="mb-2">
              {translations.noBuildings}
            </Typography>
            <Typography color="muted" variant="body2" className="mb-6">
              {translations.noBuildingsDescription}
            </Typography>
            <Button color="primary" startContent={<Plus size={16} />} onPress={onCreateModalOpen}>
              {translations.addBuilding}
            </Button>
          </div>
        </Card>

        <BuildingModal
          isOpen={isCreateModalOpen}
          onClose={onCreateModalClose}
          condominiumId={condominiumId}
          translations={translations.buildingModal}
          translateError={translateError}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table<TBuildingRow>
          aria-label="Buildings"
          columns={columns}
          rows={buildings}
          renderCell={renderCell}
          classNames={{
            wrapper: 'shadow-sm',
            tr: 'hover:bg-default-50',
          }}
        />

        {/* Expanded rows */}
        {buildings.map(building =>
          expandedRows.has(building.id) ? (
            <ExpandedBuildingRow
              key={`expanded-${building.id}`}
              building={building}
              token={token}
              translations={translations.units}
              translateError={translateError}
            />
          ) : null
        )}
      </div>

      {/* Mobile Cards */}
      <div className="block space-y-3 md:hidden">
        {buildings.map(building => (
          <Card key={building.id} className="w-full">
            <CardBody>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Building2 className="text-primary shrink-0" size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{building.name}</p>
                    {building.code && (
                      <p className="text-xs text-default-500">
                        {translations.table.code}: {building.code}
                      </p>
                    )}
                  </div>
                </div>
                <Chip color={building.isActive ? 'success' : 'default'} variant="flat" size="sm">
                  {building.isActive ? translations.status.active : translations.status.inactive}
                </Chip>
              </div>

              <div className="flex items-center gap-4 text-sm text-default-600 mb-3">
                {building.floorsCount && (
                  <span>
                    {building.floorsCount} {translations.table.floors.toLowerCase()}
                  </span>
                )}
                {building.unitsCount && (
                  <span>
                    {building.unitsCount} {translations.table.units.toLowerCase()}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <Button
                  size="sm"
                  variant="flat"
                  startContent={
                    expandedRows.has(building.id) ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )
                  }
                  onPress={() => toggleRow(building.id)}
                >
                  {translations.units.title}
                </Button>
                <div className="flex items-center gap-1">
                  <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(building)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleDelete(building)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {expandedRows.has(building.id) && (
                <div className="mt-4 border-t pt-4">
                  <ExpandedBuildingRow
                    building={building}
                    token={token}
                    translations={translations.units}
                    translateError={translateError}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <BuildingModal
        isOpen={isCreateModalOpen}
        onClose={onCreateModalClose}
        condominiumId={condominiumId}
        translations={translations.buildingModal}
        translateError={translateError}
      />

      <BuildingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          onEditModalClose()
          setSelectedBuilding(null)
        }}
        condominiumId={condominiumId}
        building={selectedBuilding}
        translations={translations.buildingModal}
        translateError={translateError}
      />

      {buildingToDelete && (
        <DeleteBuildingModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            onDeleteModalClose()
            setBuildingToDelete(null)
          }}
          buildingId={buildingToDelete.id}
          buildingName={buildingToDelete.name}
          translations={translations.deleteModal}
        />
      )}
    </div>
  )
}
