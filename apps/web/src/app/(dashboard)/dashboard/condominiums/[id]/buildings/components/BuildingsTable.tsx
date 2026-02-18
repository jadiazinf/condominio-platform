'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { TBuilding } from '@packages/domain'
import { Building2, Plus, Trash2 } from 'lucide-react'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useDisclosure } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'

import { BuildingModal } from './BuildingModal'
import { useToggleBuildingStatus } from '@packages/http-client/hooks'

type TBuildingRow = TBuilding & { id: string }

interface IBuildingsTableProps {
  buildings: TBuilding[]
  condominiumId: string
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
        floors: string
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

export function BuildingsTable({
  buildings,
  condominiumId,
  translations,
  translateError,
}: IBuildingsTableProps) {
  const router = useRouter()
  const toast = useToast()

  const {
    isOpen: isCreateModalOpen,
    onOpen: onCreateModalOpen,
    onClose: onCreateModalClose,
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

  const handleRowClick = useCallback(
    (building: TBuilding) => {
      router.push(`/dashboard/condominiums/${condominiumId}/buildings/${building.id}`)
    },
    [router, condominiumId]
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
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex items-center gap-2">
              <Building2 className="text-primary" size={16} />
              <span className="font-medium">{building.name}</span>
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
            <div className="flex items-center justify-end">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => handleToggleStatus(building)}
                isDisabled={toggleStatusMutation.isPending}
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
      translations.status,
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
          onRowClick={handleRowClick}
          classNames={{
            wrapper: 'shadow-sm',
            tr: 'hover:bg-default-50',
          }}
        />
      </div>

      {/* Mobile Cards */}
      <div className="block space-y-3 md:hidden">
        {buildings.map(building => (
          <Card
            key={building.id}
            className="w-full cursor-pointer"
            isPressable
            onPress={() => handleRowClick(building)}
          >
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

              <div className="flex items-center gap-4 text-sm text-default-600">
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

    </div>
  )
}
