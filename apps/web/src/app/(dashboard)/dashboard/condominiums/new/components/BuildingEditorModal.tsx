'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Wand2, Info, Plus, Trash2 } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Button } from '@heroui/button'
import { Divider } from '@heroui/divider'
import { Tooltip } from '@heroui/tooltip'

import { useTranslation } from '@/contexts'
import { Input, InputField } from '@/ui/components/input'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import type { TLocalBuilding, TLocalUnit } from '../hooks/useCreateCondominiumWizard'

type TUnitNamingPattern = 'floor_letter' | 'floor_sequence' | 'bldg_floor_number' | 'bldg_floor_letter'

interface TFloorGroup {
  id: string
  fromFloor: string
  toFloor: string
  unitsPerFloor: string
  unitPrefix: string
  areaM2: string
  bedrooms: string
  bathrooms: string
  parkingSpaces: string
}

interface BuildingEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<TLocalBuilding, 'tempId'>, units?: Omit<TLocalUnit, 'tempId' | 'buildingTempId'>[]) => void
  editingBuilding?: TLocalBuilding | null
  existingUnitCount?: number
}

interface BuildingWizardFormValues {
  name: string
  code: string
  floorsCount: string
  unitSeparator: string
}

function generateBuildingCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 3))
    .join('-')
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase()
  return slug ? `${slug}-${suffix}` : `BLD-${suffix}`
}

function generateUnitNumber(
  pattern: TUnitNamingPattern,
  floor: number,
  unitIndex: number,
  globalUnitIndex: number,
  separator: string,
  buildingLetter: string,
  customPrefix?: string
): string {
  if (customPrefix) {
    return `${customPrefix}${separator}${unitIndex + 1}`
  }
  switch (pattern) {
    case 'floor_letter':
      return `${floor}${String.fromCharCode(65 + unitIndex)}`
    case 'floor_sequence':
      return `${floor}${String(unitIndex + 1).padStart(2, '0')}`
    case 'bldg_floor_number':
      return `${buildingLetter}${separator}${floor}${separator}${unitIndex + 1}`
    case 'bldg_floor_letter':
      return `${buildingLetter}${separator}${floor}${String.fromCharCode(65 + unitIndex)}`
    default:
      return `${floor}${String(unitIndex + 1).padStart(2, '0')}`
  }
}

function createDefaultFloorGroup(): TFloorGroup {
  return {
    id: crypto.randomUUID(),
    fromFloor: '1',
    toFloor: '1',
    unitsPerFloor: '4',
    unitPrefix: '',
    areaM2: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpaces: '',
  }
}

function PatternButton<T extends string>({
  value,
  label,
  example,
  selected,
  onSelect,
}: {
  value: T
  label: string
  example: string
  selected: boolean
  onSelect: (v: T) => void
}) {
  return (
    <button
      type="button"
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
        selected
          ? 'border-success bg-success/10'
          : 'border-default-200 hover:border-default-400'
      }`}
      onClick={() => onSelect(value)}
    >
      <div>
        <Typography variant="body2" className="font-medium">
          {label}
        </Typography>
        <Typography variant="caption" className="text-default-400">
          {example}
        </Typography>
      </div>
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-success' : 'border-default-300'
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-success" />}
      </div>
    </button>
  )
}

export function BuildingEditorModal({
  isOpen,
  onClose,
  onSave,
  editingBuilding,
  existingUnitCount = 0,
}: BuildingEditorModalProps) {
  const { t } = useTranslation()
  const isEditing = !!editingBuilding

  const form = useForm<BuildingWizardFormValues>({
    defaultValues: {
      name: '',
      code: '',
      floorsCount: '',
      unitSeparator: '-',
    },
  })

  const [generateUnitsEnabled, setGenerateUnitsEnabled] = useState(false)
  const [selectedUnitPattern, setSelectedUnitPattern] = useState<TUnitNamingPattern>('floor_letter')
  const [floorGroups, setFloorGroups] = useState<TFloorGroup[]>([createDefaultFloorGroup()])
  const [floorGroupError, setFloorGroupError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      form.reset(
        editingBuilding
          ? {
              name: editingBuilding.name,
              code: editingBuilding.code ?? '',
              floorsCount: editingBuilding.floorsCount?.toString() ?? '',
              unitSeparator: '-',
            }
          : {
              name: '',
              code: '',
              floorsCount: '',
              unitSeparator: '-',
            }
      )
      setGenerateUnitsEnabled(false)
      setSelectedUnitPattern('floor_letter')
      setFloorGroups([createDefaultFloorGroup()])
      setFloorGroupError(null)
    }
  }, [isOpen, editingBuilding, form])

  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name) form.clearErrors(name)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const watchValues = form.watch()
  const floorsCount = Math.max(0, Number(watchValues.floorsCount) || 0)
  const unitSeparator = watchValues.unitSeparator || '-'
  const buildingName = watchValues.name || ''

  useEffect(() => {
    if (generateUnitsEnabled && floorsCount > 0 && floorGroups.length === 1 && Number(floorGroups[0].fromFloor) === 1) {
      setFloorGroups((prev) => [{ ...prev[0], toFloor: String(floorsCount) }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorsCount, generateUnitsEnabled])

  const buildingLetter = buildingName.trim().charAt(0).toUpperCase() || 'A'

  const unitPatterns: { value: TUnitNamingPattern; label: string; example: string }[] = [
    {
      value: 'floor_letter',
      label: t('superadmin.condominiums.wizard.bulk.patternFloorLetter'),
      example: '1A, 1B, 2A, 2B...',
    },
    {
      value: 'floor_sequence',
      label: t('superadmin.condominiums.wizard.bulk.patternFloorSequence'),
      example: '101, 102, 201, 202...',
    },
    {
      value: 'bldg_floor_number',
      label: t('superadmin.condominiums.wizard.bulk.patternBldgFloorNumber'),
      example: `${buildingLetter}${unitSeparator}1${unitSeparator}1, ${buildingLetter}${unitSeparator}1${unitSeparator}2...`,
    },
    {
      value: 'bldg_floor_letter',
      label: t('superadmin.condominiums.wizard.bulk.patternBldgFloorLetter'),
      example: `${buildingLetter}${unitSeparator}1A, ${buildingLetter}${unitSeparator}1B...`,
    },
  ]

  const previewUnits: string[] = []
  if (generateUnitsEnabled && floorGroups.length > 0) {
    let globalIdx = 0
    const sorted = [...floorGroups].sort((a, b) => (Number(a.fromFloor) || 0) - (Number(b.fromFloor) || 0))
    for (const group of sorted) {
      const gFrom = Number(group.fromFloor) || 0
      const gTo = Number(group.toFloor) || 0
      const gPer = Number(group.unitsPerFloor) || 0
      if (gFrom > 0 && gTo >= gFrom && gPer > 0) {
        for (let floor = gFrom; floor <= gTo; floor++) {
          for (let u = 0; u < gPer; u++) {
            if (previewUnits.length < 8) {
              previewUnits.push(generateUnitNumber(selectedUnitPattern, floor, u, globalIdx, unitSeparator, buildingLetter, group.unitPrefix || undefined))
            }
            globalIdx++
          }
        }
      }
    }
  }

  const totalUnits = generateUnitsEnabled
    ? floorGroups.reduce((sum, g) => {
        const from = Number(g.fromFloor) || 0
        const to = Number(g.toFloor) || 0
        const perFloor = Number(g.unitsPerFloor) || 0
        const floors = Math.max(0, to - from + 1)
        return sum + floors * perFloor
      }, 0)
    : 0

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  const handleGenerateCode = useCallback(() => {
    const name = form.getValues('name')
    const code = generateBuildingCode(name)
    form.setValue('code', code, { shouldValidate: true })
  }, [form])

  const addFloorGroup = useCallback(() => {
    setFloorGroups((prev) => {
      const lastGroup = prev[prev.length - 1]
      const nextFrom = lastGroup ? (Number(lastGroup.toFloor) || 0) + 1 : 1
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          fromFloor: String(nextFrom),
          toFloor: String(Math.max(nextFrom, floorsCount)),
          unitsPerFloor: '4',
          unitPrefix: '',
          areaM2: '',
          bedrooms: '',
          bathrooms: '',
          parkingSpaces: '',
        },
      ]
    })
    setFloorGroupError(null)
  }, [floorsCount])

  const removeFloorGroup = useCallback((id: string) => {
    setFloorGroups((prev) => prev.filter((g) => g.id !== id))
    setFloorGroupError(null)
  }, [])

  const updateFloorGroup = useCallback((id: string, updates: Partial<Omit<TFloorGroup, 'id'>>) => {
    setFloorGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)))
    setFloorGroupError(null)
  }, [])

  const handleSave = useCallback(() => {
    const values = form.getValues()
    let hasError = false

    if (!values.name || values.name.trim() === '') {
      form.setError('name', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.buildings.nameRequired',
      })
      hasError = true
    }
    if (!values.code || values.code.trim() === '') {
      form.setError('code', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.buildings.codeRequired',
      })
      hasError = true
    }
    if (!values.floorsCount) {
      form.setError('floorsCount', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.buildings.floorsRequired',
      })
      hasError = true
    } else if (!Number.isInteger(Number(values.floorsCount)) || Number(values.floorsCount) < 1) {
      form.setError('floorsCount', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.buildings.floorsInteger',
      })
      hasError = true
    }

    if (generateUnitsEnabled) {
      const floorsNum = Number(values.floorsCount) || 0

      if (floorsNum < 1) {
        form.setError('floorsCount', {
          type: 'manual',
          message: 'superadmin.condominiums.wizard.bulkBuildings.floorsRequiredForUnits',
        })
        hasError = true
      }

      if (floorGroups.length === 0) {
        setFloorGroupError('superadmin.condominiums.wizard.bulk.floorGroupRequired')
        hasError = true
      }

      for (const group of floorGroups) {
        const gFrom = Number(group.fromFloor) || 0
        const gTo = Number(group.toFloor) || 0
        const gPer = Number(group.unitsPerFloor) || 0
        if (gFrom < 1 || gTo < gFrom) {
          setFloorGroupError('superadmin.condominiums.wizard.bulk.floorRangeError')
          hasError = true
          break
        }
        if (gPer < 1) {
          setFloorGroupError('superadmin.condominiums.wizard.bulk.unitsPerFloorRequired')
          hasError = true
          break
        }
        if ((selectedUnitPattern === 'floor_letter' || selectedUnitPattern === 'bldg_floor_letter') && gPer > 26) {
          setFloorGroupError('superadmin.condominiums.wizard.bulk.maxLetterUnits')
          hasError = true
          break
        }
      }

      const sortedGroups = [...floorGroups].sort((a, b) => (Number(a.fromFloor) || 0) - (Number(b.fromFloor) || 0))
      for (let i = 1; i < sortedGroups.length; i++) {
        if ((Number(sortedGroups[i].fromFloor) || 0) <= (Number(sortedGroups[i - 1].toFloor) || 0)) {
          setFloorGroupError('superadmin.condominiums.wizard.bulk.floorOverlap')
          hasError = true
          break
        }
      }
    }

    if (hasError) return

    const floorsNum = Number(values.floorsCount)
    const buildingData: Omit<TLocalBuilding, 'tempId'> = {
      name: values.name.trim(),
      code: values.code.trim(),
      floorsCount: floorsNum,
    }

    let generatedUnits: Omit<TLocalUnit, 'tempId' | 'buildingTempId'>[] | undefined
    if (generateUnitsEnabled) {
      generatedUnits = []
      const sep = values.unitSeparator || '-'
      const bLetter = values.name.trim().charAt(0).toUpperCase() || 'A'
      let globalIdx = 0

      const sortedGroups = [...floorGroups].sort((a, b) => (Number(a.fromFloor) || 0) - (Number(b.fromFloor) || 0))
      for (const group of sortedGroups) {
        const gFrom = Number(group.fromFloor) || 0
        const gTo = Number(group.toFloor) || 0
        const gPer = Number(group.unitsPerFloor) || 0
        for (let floor = gFrom; floor <= Math.min(gTo, floorsNum); floor++) {
          for (let u = 0; u < gPer; u++) {
            generatedUnits.push({
              unitNumber: generateUnitNumber(selectedUnitPattern, floor, u, globalIdx, sep, bLetter, group.unitPrefix || undefined),
              floor,
              areaM2: group.areaM2 || null,
              bedrooms: group.bedrooms ? Number(group.bedrooms) : null,
              bathrooms: group.bathrooms ? Number(group.bathrooms) : null,
              parkingSpaces: group.parkingSpaces ? Number(group.parkingSpaces) : undefined,
              parkingIdentifiers: null,
              storageIdentifier: null,
              aliquotPercentage: null,
            })
            globalIdx++
          }
        }
      }
    }

    onSave(buildingData, generatedUnits)
    onClose()
  }, [form, generateUnitsEnabled, selectedUnitPattern, floorGroups, onSave, onClose])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          {isEditing
            ? t('superadmin.condominiums.wizard.buildings.edit')
            : t('superadmin.condominiums.wizard.buildings.add')}
        </ModalHeader>
        <ModalBody>
          <FormProvider {...form}>
            <div className="flex flex-col gap-6">
              <InputField
                name="name"
                label={t('superadmin.condominiums.detail.buildings.form.name')}
                placeholder={t('superadmin.condominiums.detail.buildings.form.namePlaceholder')}
                isRequired
                translateError={translateError}
              />

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <InputField
                    name="code"
                    label={t('superadmin.condominiums.detail.buildings.form.code')}
                    placeholder={t('superadmin.condominiums.detail.buildings.form.codePlaceholder')}
                    isRequired
                    translateError={translateError}
                  />
                </div>
                <Tooltip
                  content={t('superadmin.condominiums.form.fields.generateCode')}
                  placement="top"
                >
                  <Button
                    type="button"
                    variant="flat"
                    color="success"
                    size="sm"
                    isIconOnly
                    onPress={handleGenerateCode}
                  >
                    <Wand2 size={14} />
                  </Button>
                </Tooltip>
              </div>

              <InputField
                name="floorsCount"
                label={t('superadmin.condominiums.detail.buildings.form.floors')}
                placeholder="Ej: 10"
                type="number"
                inputMode="numeric"
                isRequired
                translateError={translateError}
              />

              <Divider />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5">
                    <Typography variant="subtitle2" className="font-medium">
                      {t('superadmin.condominiums.wizard.bulkBuildings.generateUnits')}
                    </Typography>
                    <Tooltip content={t('superadmin.condominiums.wizard.bulkBuildings.generateUnitsHint')} placement="right" showArrow classNames={{ content: 'max-w-xs text-sm' }}>
                      <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
                    </Tooltip>
                  </span>
                  <Switch
                    size="sm"
                    color="success"
                    isSelected={generateUnitsEnabled}
                    onValueChange={setGenerateUnitsEnabled}
                  />
                </div>

                {isEditing && existingUnitCount > 0 && (
                  <Typography variant="caption" className="text-warning-600 block mb-2">
                    {t('superadmin.condominiums.wizard.buildings.existingUnitsWarning', { count: existingUnitCount })}
                  </Typography>
                )}

                {generateUnitsEnabled && (
                  <div className="flex flex-col gap-5 mt-4 p-4 rounded-lg border border-success/30 bg-success/5">
                    <div>
                      <Typography variant="subtitle2" className="font-medium mb-3">
                        {t('superadmin.condominiums.wizard.bulk.namingPattern')}
                      </Typography>
                      <div className="flex flex-col gap-2">
                        {unitPatterns.map((p) => (
                          <PatternButton
                            key={p.value}
                            value={p.value}
                            label={p.label}
                            example={p.example}
                            selected={selectedUnitPattern === p.value}
                            onSelect={setSelectedUnitPattern}
                          />
                        ))}
                      </div>
                      <div className="mt-5 w-32">
                        <InputField
                          name="unitSeparator"
                          label={t('superadmin.condominiums.wizard.bulk.separator')}
                          placeholder="-"
                          translateError={translateError}
                        />
                      </div>
                    </div>

                    <Divider />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5">
                          <Typography variant="subtitle2" className="font-medium">
                            {t('superadmin.condominiums.wizard.bulk.floorGroups')}
                          </Typography>
                          <Tooltip content={t('superadmin.condominiums.wizard.bulk.floorGroupsHint')} placement="right" showArrow classNames={{ content: 'max-w-xs text-sm' }}>
                            <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
                          </Tooltip>
                        </span>
                        <Button
                          size="sm"
                          variant="flat"
                          color="success"
                          startContent={<Plus size={14} />}
                          onPress={addFloorGroup}
                        >
                          {t('superadmin.condominiums.wizard.bulk.addFloorGroup')}
                        </Button>
                      </div>

                      <div className="flex flex-col gap-3 mt-3">
                        {floorGroups.map((group) => (
                          <div key={group.id} className="flex items-center gap-2">
                            <div className="flex-1 p-3 rounded-lg border border-default-200 bg-default-50 space-y-3">
                              <div className="grid grid-cols-4 gap-2">
                                <Input
                                  isRequired
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.wizard.bulk.floorFrom')}
                                  value={group.fromFloor}
                                  onValueChange={(v) => updateFloorGroup(group.id, { fromFloor: v })}
                                />
                                <Input
                                  isRequired
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.wizard.bulk.floorTo')}
                                  value={group.toFloor}
                                  onValueChange={(v) => updateFloorGroup(group.id, { toFloor: v })}
                                />
                                <Input
                                  isRequired
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.wizard.bulk.unitsPerFloor')}
                                  value={group.unitsPerFloor}
                                  onValueChange={(v) => updateFloorGroup(group.id, { unitsPerFloor: v })}
                                />
                                <Input
                                  size="sm"
                                  label={t('superadmin.condominiums.wizard.bulk.unitPrefix')}
                                  placeholder={t('common.optional')}
                                  value={group.unitPrefix}
                                  onValueChange={(v) => updateFloorGroup(group.id, { unitPrefix: v })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <Input
                                  size="sm"
                                  label={t('superadmin.condominiums.detail.units.form.area')}
                                  value={group.areaM2}
                                  onValueChange={(v) => updateFloorGroup(group.id, { areaM2: v })}
                                />
                                <Input
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.detail.units.form.bedrooms')}
                                  value={group.bedrooms}
                                  onValueChange={(v) => updateFloorGroup(group.id, { bedrooms: v })}
                                />
                                <Input
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.detail.units.form.bathrooms')}
                                  value={group.bathrooms}
                                  onValueChange={(v) => updateFloorGroup(group.id, { bathrooms: v })}
                                />
                                <Input
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.detail.units.form.parkingSpaces')}
                                  value={group.parkingSpaces}
                                  onValueChange={(v) => updateFloorGroup(group.id, { parkingSpaces: v })}
                                />
                              </div>
                            </div>
                            {floorGroups.length > 1 && (
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => removeFloorGroup(group.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {floorGroupError && (
                        <Typography variant="caption" className="text-danger mt-2 block">
                          {t(floorGroupError)}
                        </Typography>
                      )}
                    </div>

                    {previewUnits.length > 0 && (
                      <>
                        <Divider />
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Typography variant="subtitle2" className="font-medium">
                              {t('superadmin.condominiums.wizard.bulk.preview')}
                            </Typography>
                            <Typography variant="caption" className="text-success-600 font-medium">
                              {totalUnits} {t('superadmin.condominiums.wizard.units.label')}
                            </Typography>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {previewUnits.map((u, j) => (
                              <span
                                key={j}
                                className="px-1.5 py-0.5 text-[10px] rounded bg-default-200 text-default-600 font-mono"
                              >
                                {u}
                              </span>
                            ))}
                            {totalUnits > previewUnits.length && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded text-default-400">
                                +{totalUnits - previewUnits.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </FormProvider>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button color="success" onPress={handleSave}>
            {isEditing ? t('common.save') : t('superadmin.condominiums.wizard.buildings.add')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
