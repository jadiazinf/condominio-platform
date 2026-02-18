'use client'

import { useState, useCallback } from 'react'
import { Home, Plus, Pencil, Trash2, Building2, Zap, FileSpreadsheet, XCircle } from 'lucide-react'
import { Button } from '@heroui/button'
import { Accordion, AccordionItem } from '@heroui/accordion'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@heroui/chip'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { UnitEditorModal } from './UnitEditorModal'
import { BulkUnitGeneratorModal } from './BulkUnitGeneratorModal'
import { CsvUnitImportModal } from './CsvUnitImportModal'
import type { TLocalUnit, TLocalBuilding, TUseCreateCondominiumWizard } from '../hooks/useCreateCondominiumWizard'

interface UnitsStepProps {
  wizard: TUseCreateCondominiumWizard
}

export function UnitsStep({ wizard }: UnitsStepProps) {
  const { t } = useTranslation()
  const { buildings, addUnit, addBulkUnits, updateUnit, removeUnit, clearUnitsForBuilding, getUnitsForBuilding } = wizard

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<TLocalUnit | null>(null)
  const [activeBuildingTempId, setActiveBuildingTempId] = useState<string>('')
  const [activeBuildingName, setActiveBuildingName] = useState<string>('')
  const [activeBuildingFloors, setActiveBuildingFloors] = useState<number | null>(null)

  const handleAddUnit = useCallback(
    (building: TLocalBuilding) => {
      setActiveBuildingTempId(building.tempId)
      setActiveBuildingName(building.name)
      setEditingUnit(null)
      setIsModalOpen(true)
    },
    []
  )

  const handleEditUnit = useCallback(
    (building: TLocalBuilding, unit: TLocalUnit) => {
      setActiveBuildingTempId(building.tempId)
      setActiveBuildingName(building.name)
      setEditingUnit(unit)
      setIsModalOpen(true)
    },
    []
  )

  const handleOpenBulkGenerator = useCallback(
    (building: TLocalBuilding) => {
      setActiveBuildingTempId(building.tempId)
      setActiveBuildingName(building.name)
      setActiveBuildingFloors(building.floorsCount ?? null)
      setIsBulkModalOpen(true)
    },
    []
  )

  const handleOpenCsvImport = useCallback(
    (building: TLocalBuilding) => {
      setActiveBuildingTempId(building.tempId)
      setActiveBuildingName(building.name)
      setIsCsvModalOpen(true)
    },
    []
  )

  const handleSave = useCallback(
    (data: Omit<TLocalUnit, 'tempId'>) => {
      if (editingUnit) {
        const { buildingTempId, ...updateData } = data
        updateUnit(editingUnit.buildingTempId, editingUnit.tempId, updateData)
      } else {
        addUnit(data)
      }
      setIsModalOpen(false)
      setEditingUnit(null)
    },
    [editingUnit, addUnit, updateUnit]
  )

  const handleBulkGenerate = useCallback(
    (units: Omit<TLocalUnit, 'tempId'>[]) => {
      addBulkUnits(units)
    },
    [addBulkUnits]
  )

  const handleCsvImport = useCallback(
    (units: Omit<TLocalUnit, 'tempId'>[]) => {
      addBulkUnits(units)
    },
    [addBulkUnits]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.condominiums.wizard.units.title')}
        </Typography>
        <Typography variant="body2" className="text-default-500">
          {t('superadmin.condominiums.wizard.units.subtitle')}
        </Typography>
      </div>

      {/* Buildings Accordion */}
      <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={buildings.map((b) => b.tempId)}>
        {buildings.map((building) => {
          const buildingUnits = getUnitsForBuilding(building.tempId)
          const hasAliquots = buildingUnits.some((u) => u.aliquotPercentage)
          const aliquotSum = hasAliquots
            ? buildingUnits.reduce((sum, u) => {
                const pct = parseFloat(u.aliquotPercentage || '0')
                return sum + (isNaN(pct) ? 0 : pct)
              }, 0)
            : 0
          const aliquotOk = hasAliquots && Math.abs(aliquotSum - 100) < 0.01

          return (
            <AccordionItem
              key={building.tempId}
              title={
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 size={16} className="text-primary" />
                  <span className="font-medium">{building.name}</span>
                  <Chip size="sm" variant="flat" color={buildingUnits.length > 0 ? 'success' : 'warning'}>
                    {buildingUnits.length} {t('superadmin.condominiums.wizard.units.label')}
                  </Chip>
                  {hasAliquots && (
                    <Chip size="sm" variant="flat" color={aliquotOk ? 'success' : 'warning'}>
                      {aliquotOk
                        ? t('superadmin.condominiums.wizard.units.aliquotOk')
                        : t('superadmin.condominiums.wizard.units.aliquotWarning', { sum: aliquotSum.toFixed(2) })}
                    </Chip>
                  )}
                </div>
              }
            >
              <div className="space-y-3 pb-2">
                {buildingUnits.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Home className="h-8 w-8 text-default-300 mb-2" />
                    <Typography variant="body2" className="text-default-400">
                      {t('superadmin.condominiums.wizard.units.empty')}
                    </Typography>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {buildingUnits.map((unit) => (
                      <Card key={unit.tempId} className="border border-default-100" shadow="none">
                        <CardBody className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <Typography variant="subtitle2" className="font-medium">
                                {unit.unitNumber}
                              </Typography>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {unit.floor != null && (
                                  <span className="text-xs text-default-500">
                                    {t('superadmin.condominiums.detail.units.form.floor')}: {unit.floor}
                                  </span>
                                )}
                                {unit.areaM2 && (
                                  <span className="text-xs text-default-500">
                                    {unit.areaM2}m²
                                  </span>
                                )}
                                {unit.bedrooms != null && (
                                  <span className="text-xs text-default-500">
                                    {unit.bedrooms}H
                                  </span>
                                )}
                                {unit.bathrooms != null && (
                                  <span className="text-xs text-default-500">
                                    {unit.bathrooms}B
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleEditUnit(building, unit)}
                              >
                                <Pencil size={12} />
                              </Button>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => removeUnit(building.tempId, unit.tempId)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    color="success"
                    variant="flat"
                    startContent={<Plus size={14} />}
                    onPress={() => handleAddUnit(building)}
                  >
                    {t('superadmin.condominiums.wizard.units.add')}
                  </Button>
                  <Button
                    size="sm"
                    color="success"
                    variant="bordered"
                    startContent={<Zap size={14} />}
                    onPress={() => handleOpenBulkGenerator(building)}
                  >
                    {t('superadmin.condominiums.wizard.bulk.generate')}
                  </Button>
                  <Button
                    size="sm"
                    color="default"
                    variant="bordered"
                    startContent={<FileSpreadsheet size={14} />}
                    onPress={() => handleOpenCsvImport(building)}
                  >
                    {t('superadmin.condominiums.wizard.csv.importButton')}
                  </Button>
                  {buildingUnits.length > 0 && (
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      startContent={<XCircle size={14} />}
                      onPress={() => clearUnitsForBuilding(building.tempId)}
                    >
                      {t('superadmin.condominiums.wizard.units.clearAll')}
                    </Button>
                  )}
                </div>
              </div>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Unit Editor Modal */}
      <UnitEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingUnit(null)
        }}
        onSave={handleSave}
        buildingTempId={activeBuildingTempId}
        buildingName={activeBuildingName}
        editingUnit={editingUnit}
      />

      {/* Bulk Unit Generator Modal */}
      <BulkUnitGeneratorModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onGenerate={handleBulkGenerate}
        buildingTempId={activeBuildingTempId}
        buildingName={activeBuildingName}
        buildingFloors={activeBuildingFloors}
      />

      {/* CSV Import Modal */}
      <CsvUnitImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleCsvImport}
        buildingTempId={activeBuildingTempId}
        buildingName={activeBuildingName}
      />
    </div>
  )
}
