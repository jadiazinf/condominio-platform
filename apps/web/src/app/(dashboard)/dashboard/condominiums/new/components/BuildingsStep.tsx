'use client'

import { useState, useCallback } from 'react'
import { Building2, Plus, Pencil, Trash2, Zap, RotateCcw } from 'lucide-react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@/ui/components/card'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { BuildingEditorModal } from './BuildingEditorModal'
import { BulkBuildingGeneratorModal, type TBulkGenerationResult } from './BulkBuildingGeneratorModal'
import type { TLocalBuilding, TLocalUnit, TUseCreateCondominiumWizard } from '../hooks/useCreateCondominiumWizard'

interface BuildingsStepProps {
  wizard: TUseCreateCondominiumWizard
}

export function BuildingsStep({ wizard }: BuildingsStepProps) {
  const { t } = useTranslation()
  const {
    buildings,
    addBuilding,
    addBulkBuildings,
    addBulkUnits,
    addUnit,
    updateBuilding,
    removeBuilding,
    clearAllBuildings,
    clearUnitsForBuilding,
    bulkConfig,
    setBulkConfig,
    getUnitsForBuilding,
  } = wizard

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<TLocalBuilding | null>(null)

  const handleAdd = useCallback(() => {
    setEditingBuilding(null)
    setIsModalOpen(true)
  }, [])

  const handleEdit = useCallback((building: TLocalBuilding) => {
    setEditingBuilding(building)
    setIsModalOpen(true)
  }, [])

  const handleSave = useCallback(
    (data: Omit<TLocalBuilding, 'tempId'>, units?: Omit<TLocalUnit, 'tempId' | 'buildingTempId'>[]) => {
      let buildingTempId: string
      if (editingBuilding) {
        updateBuilding(editingBuilding.tempId, data)
        buildingTempId = editingBuilding.tempId
      } else {
        buildingTempId = addBuilding(data)
      }

      if (units) {
        clearUnitsForBuilding(buildingTempId)
        for (const unit of units) {
          addUnit({ ...unit, buildingTempId })
        }
      }

      setIsModalOpen(false)
      setEditingBuilding(null)
    },
    [editingBuilding, addBuilding, updateBuilding, clearUnitsForBuilding, addUnit]
  )

  const handleRemove = useCallback(
    (tempId: string) => {
      removeBuilding(tempId)
    },
    [removeBuilding]
  )

  const [bulkEditMode, setBulkEditMode] = useState(false)

  const handleBulkGenerate = useCallback(
    (result: TBulkGenerationResult) => {
      if (bulkEditMode) {
        clearAllBuildings()
      }

      const createdBuildings = addBulkBuildings(result.buildings)

      const hasUnits = result.unitsPerBuilding.some((u) => u.length > 0)
      if (hasUnits) {
        const allUnits: Omit<TLocalUnit, 'tempId'>[] = []
        createdBuildings.forEach((building, i) => {
          const buildingUnits = result.unitsPerBuilding[i] || []
          for (const unit of buildingUnits) {
            allUnits.push({ ...unit, buildingTempId: building.tempId })
          }
        })
        addBulkUnits(allUnits)
      }

      setBulkConfig(result.config)
      setBulkEditMode(false)
    },
    [addBulkBuildings, addBulkUnits, setBulkConfig, bulkEditMode, clearAllBuildings]
  )

  const handleBulkEdit = useCallback(() => {
    setBulkEditMode(true)
    setIsBulkModalOpen(true)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="subtitle1" className="font-semibold">
            {t('superadmin.condominiums.wizard.buildings.title')}
          </Typography>
          <Typography variant="body2" className="text-default-500">
            {t('superadmin.condominiums.wizard.buildings.subtitle')}
          </Typography>
        </div>
        <div className="flex gap-2">
          {buildings.length > 0 && (
            <>
              <Button
                color="danger"
                variant="light"
                startContent={<Trash2 size={16} />}
                onPress={clearAllBuildings}
              >
                {t('superadmin.condominiums.wizard.buildings.clearAll')}
              </Button>
              {bulkConfig && (
                <Button
                  color="warning"
                  variant="flat"
                  startContent={<RotateCcw size={16} />}
                  onPress={handleBulkEdit}
                >
                  {t('superadmin.condominiums.wizard.buildings.editBulk')}
                </Button>
              )}
            </>
          )}
          <Button
            color="success"
            variant="bordered"
            startContent={<Zap size={16} />}
            onPress={() => setIsBulkModalOpen(true)}
          >
            {t('superadmin.condominiums.wizard.bulkBuildings.title')}
          </Button>
          <Button color="success" variant="flat" startContent={<Plus size={16} />} onPress={handleAdd}>
            {t('superadmin.condominiums.wizard.buildings.add')}
          </Button>
        </div>
      </div>

      {buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-default-100 mb-4">
            <Building2 className="h-8 w-8 text-default-400" />
          </div>
          <Typography variant="subtitle1" className="text-default-500">
            {t('superadmin.condominiums.wizard.buildings.empty')}
          </Typography>
          <Typography variant="body2" className="text-default-400 mt-1">
            {t('superadmin.condominiums.wizard.buildings.emptyDescription')}
          </Typography>
          <Button
            color="success"
            variant="flat"
            startContent={<Plus size={16} />}
            className="mt-4"
            onPress={handleAdd}
          >
            {t('superadmin.condominiums.wizard.buildings.add')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {buildings.map((building) => {
            const unitCount = getUnitsForBuilding(building.tempId).length
            return (
              <Card key={building.tempId} className="border border-default-200" shadow="none">
                <CardBody className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <Typography variant="subtitle2" className="font-semibold truncate">
                          {building.name}
                        </Typography>
                        {building.code && (
                          <Typography variant="caption" className="text-default-500">
                            {building.code}
                          </Typography>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {building.floorsCount && (
                            <span className="inline-flex items-center rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600">
                              {building.floorsCount} {t('superadmin.condominiums.wizard.buildings.floorsLabel')}
                            </span>
                          )}
                          {unitCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs text-success-700">
                              {unitCount} {t('superadmin.condominiums.wizard.units.label')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleEdit(building)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleRemove(building.tempId)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <BuildingEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingBuilding(null)
        }}
        onSave={handleSave}
        editingBuilding={editingBuilding}
        existingUnitCount={editingBuilding ? getUnitsForBuilding(editingBuilding.tempId).length : 0}
      />

      <BulkBuildingGeneratorModal
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false)
          setBulkEditMode(false)
        }}
        onGenerate={handleBulkGenerate}
        initialConfig={bulkEditMode ? bulkConfig : null}
      />
    </div>
  )
}
