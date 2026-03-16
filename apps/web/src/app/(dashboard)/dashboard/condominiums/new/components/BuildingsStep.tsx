'use client'

import type {
  TLocalBuilding,
  TLocalUnit,
  TUseCreateCondominiumWizard,
} from '../hooks/useCreateCondominiumWizard'

import { useState, useCallback } from 'react'
import { Building2, Zap, Pencil, Trash2, RotateCcw, Check, X } from 'lucide-react'
import { Button } from '@heroui/button'

import {
  BulkBuildingGeneratorModal,
  type TBulkGenerationResult,
} from './BulkBuildingGeneratorModal'

import { Card, CardBody } from '@/ui/components/card'
import { Input } from '@/ui/components/input'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface BuildingsStepProps {
  wizard: TUseCreateCondominiumWizard
}

export function BuildingsStep({ wizard }: BuildingsStepProps) {
  const { t } = useTranslation()
  const {
    buildings,
    addBulkBuildings,
    addBulkUnits,
    updateBuilding,
    removeBuilding,
    clearAllBuildings,
    bulkConfig,
    setBulkConfig,
    getUnitsForBuilding,
  } = wizard

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')

  const handleStartEdit = useCallback((building: TLocalBuilding) => {
    setEditingBuildingId(building.tempId)
    setEditName(building.name)
    setEditCode(building.code ?? '')
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingBuildingId || !editName.trim()) return
    updateBuilding(editingBuildingId, { name: editName.trim(), code: editCode.trim() || null })
    setEditingBuildingId(null)
  }, [editingBuildingId, editName, editCode, updateBuilding])

  const handleCancelEdit = useCallback(() => {
    setEditingBuildingId(null)
  }, [])

  const [bulkEditMode, setBulkEditMode] = useState(false)

  const handleBulkGenerate = useCallback(
    (result: TBulkGenerationResult) => {
      if (bulkEditMode) {
        clearAllBuildings()
      }

      const createdBuildings = addBulkBuildings(result.buildings)

      const hasUnits = result.unitsPerBuilding.some(u => u.length > 0)

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
          <Typography className="font-semibold" variant="subtitle1">
            {t('superadmin.condominiums.wizard.buildings.title')}
          </Typography>
          <Typography className="text-default-500" variant="body2">
            {t('superadmin.condominiums.wizard.buildings.subtitle')}
          </Typography>
        </div>
        {buildings.length > 0 && (
          <div className="flex gap-2">
            <Button
              color="danger"
              startContent={<Trash2 size={16} />}
              variant="light"
              onPress={clearAllBuildings}
            >
              {t('superadmin.condominiums.wizard.buildings.clearAll')}
            </Button>
            {bulkConfig && (
              <Button
                color="warning"
                startContent={<RotateCcw size={16} />}
                variant="flat"
                onPress={handleBulkEdit}
              >
                {t('superadmin.condominiums.wizard.buildings.editBulk')}
              </Button>
            )}
            <Button
              color="success"
              startContent={<Zap size={16} />}
              variant="flat"
              onPress={() => setIsBulkModalOpen(true)}
            >
              {t('superadmin.condominiums.wizard.bulkBuildings.title')}
            </Button>
          </div>
        )}
      </div>

      {buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-default-100 mb-4">
            <Building2 className="h-8 w-8 text-default-400" />
          </div>
          <Typography className="text-default-500" variant="subtitle1">
            {t('superadmin.condominiums.wizard.buildings.empty')}
          </Typography>
          <Typography className="text-default-400 mt-1" variant="body2">
            {t('superadmin.condominiums.wizard.buildings.emptyDescription')}
          </Typography>
          <Button
            className="mt-4"
            color="success"
            startContent={<Zap size={16} />}
            variant="flat"
            onPress={() => setIsBulkModalOpen(true)}
          >
            {t('superadmin.condominiums.wizard.bulkBuildings.title')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {buildings.map(building => {
            const unitCount = getUnitsForBuilding(building.tempId).length
            const isEditing = editingBuildingId === building.tempId

            return (
              <Card key={building.tempId} className="border border-default-200" shadow="none">
                <CardBody className="p-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <Input
                            label={t('superadmin.condominiums.detail.buildings.form.name')}
                            size="sm"
                            value={editName}
                            onValueChange={setEditName}
                          />
                          <Input
                            label={t('superadmin.condominiums.detail.buildings.form.code')}
                            placeholder={t('common.optional')}
                            size="sm"
                            value={editCode}
                            onValueChange={setEditCode}
                          />
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            isIconOnly
                            color="success"
                            isDisabled={!editName.trim()}
                            size="sm"
                            variant="flat"
                            onPress={handleSaveEdit}
                          >
                            <Check size={14} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" onPress={handleCancelEdit}>
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <Typography className="font-semibold truncate" variant="subtitle2">
                            {building.name}
                          </Typography>
                          {building.code && (
                            <Typography className="text-default-500" variant="caption">
                              {building.code}
                            </Typography>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {building.floorsCount && (
                              <span className="inline-flex items-center rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600">
                                {building.floorsCount}{' '}
                                {t('superadmin.condominiums.wizard.buildings.floorsLabel')}
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
                          onPress={() => handleStartEdit(building)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          color="danger"
                          size="sm"
                          variant="light"
                          onPress={() => removeBuilding(building.tempId)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <BulkBuildingGeneratorModal
        initialConfig={bulkEditMode ? bulkConfig : null}
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false)
          setBulkEditMode(false)
        }}
        onGenerate={handleBulkGenerate}
      />
    </div>
  )
}
