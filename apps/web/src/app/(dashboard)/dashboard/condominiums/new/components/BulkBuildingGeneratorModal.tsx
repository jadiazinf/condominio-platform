'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Button } from '@heroui/button'
import { Divider } from '@heroui/divider'
import { Info, Plus, Trash2 } from 'lucide-react'
import { Tooltip } from '@heroui/tooltip'

import { useTranslation } from '@/contexts'
import { Input, InputField } from '@/ui/components/input'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import type { TLocalBuilding, TLocalUnit } from '../hooks/useCreateCondominiumWizard'

type TNamingPattern = 'prefix_letter' | 'prefix_number' | 'letter_only' | 'number_only'
type TCodePattern = 'padded_number' | 'letter' | 'triple_letter'
type TUnitNamingPattern = 'floor_letter' | 'floor_sequence' | 'bldg_sequential' | 'bldg_floor_number' | 'bldg_floor_letter'

type TAliquotMode = 'equal' | 'by_area' | 'custom' | 'none'

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
  aliquotPercentage: string
}

export interface TBulkGenerationConfig {
  prefix: string
  count: string
  floorsCount: string
  codePrefix: string
  unitSeparator: string
  namePattern: TNamingPattern
  codeEnabled: boolean
  codePattern: TCodePattern
  generateUnitsEnabled: boolean
  unitPattern: TUnitNamingPattern
  floorGroups: TFloorGroup[]
  aliquotMode: TAliquotMode
}

export interface TBulkGenerationResult {
  buildings: Omit<TLocalBuilding, 'tempId'>[]
  unitsPerBuilding: Omit<TLocalUnit, 'tempId' | 'buildingTempId'>[][]
  config: TBulkGenerationConfig
}

interface BulkBuildingGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (result: TBulkGenerationResult) => void
  initialConfig?: TBulkGenerationConfig | null
}

interface BulkBuildingFormValues {
  prefix: string
  count: string
  codePrefix: string
  unitSeparator: string
}

function generateBuildingName(prefix: string, pattern: TNamingPattern, index: number): string {
  switch (pattern) {
    case 'prefix_letter':
      return `${prefix} ${String.fromCharCode(65 + index)}`
    case 'prefix_number':
      return `${prefix} ${index + 1}`
    case 'letter_only':
      return String.fromCharCode(65 + index)
    case 'number_only':
      return `${index + 1}`
    default:
      return `${prefix} ${index + 1}`
  }
}

function generateBuildingCode(codePrefix: string, pattern: TCodePattern, index: number): string {
  const separator = codePrefix.endsWith('-') ? '' : '-'
  const base = codePrefix ? `${codePrefix}${separator}` : ''

  switch (pattern) {
    case 'padded_number':
      return `${base}${String(index + 1).padStart(3, '0')}`
    case 'letter':
      return `${base}${String.fromCharCode(65 + index)}`
    case 'triple_letter': {
      const a = Math.floor(index / (26 * 26)) % 26
      const b = Math.floor(index / 26) % 26
      const c = index % 26
      return `${base}${String.fromCharCode(65 + a)}${String.fromCharCode(65 + b)}${String.fromCharCode(65 + c)}`
    }
    default:
      return `${base}${String(index + 1).padStart(3, '0')}`
  }
}

function generateUnitNumber(
  pattern: TUnitNamingPattern,
  buildingIndex: number,
  floor: number,
  unitIndex: number,
  globalUnitIndex: number,
  separator: string,
  customPrefix?: string
): string {
  const bldgLetter = String.fromCharCode(65 + buildingIndex)
  if (customPrefix) {
    return `${customPrefix}${separator}${bldgLetter}${separator}${unitIndex + 1}`
  }
  switch (pattern) {
    case 'floor_letter':
      return `${floor}${String.fromCharCode(65 + unitIndex)}`
    case 'floor_sequence':
      return `${floor}${String(unitIndex + 1).padStart(2, '0')}`
    case 'bldg_sequential':
      return `${bldgLetter}${separator}${globalUnitIndex + 1}`
    case 'bldg_floor_number':
      return `${bldgLetter}${separator}${floor}${separator}${unitIndex + 1}`
    case 'bldg_floor_letter':
      return `${bldgLetter}${separator}${floor}${String.fromCharCode(65 + unitIndex)}`
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
    aliquotPercentage: '',
  }
}

type TPreviewItem = { name: string; code: string | null; sampleUnits?: string[]; totalUnits?: number }

function generatePreview(
  prefix: string,
  count: number,
  namePattern: TNamingPattern,
  codeEnabled: boolean,
  codePrefix: string,
  codePattern: TCodePattern,
  generateUnits: boolean,
  floorGroups: TFloorGroup[],
  unitPattern: TUnitNamingPattern,
  unitSeparator: string
): TPreviewItem[] {
  const preview: TPreviewItem[] = []
  const maxPreview = 6

  for (let i = 0; i < count && i < maxPreview; i++) {
    const item: TPreviewItem = {
      name: generateBuildingName(prefix, namePattern, i),
      code: codeEnabled ? generateBuildingCode(codePrefix, codePattern, i) : null,
    }

    if (generateUnits && floorGroups.length > 0) {
      const sampleUnits: string[] = []
      const maxSampleUnits = 6
      let globalIdx = 0
      let total = 0

      const sorted = [...floorGroups].sort((a, b) => (Number(a.fromFloor) || 0) - (Number(b.fromFloor) || 0))
      for (const group of sorted) {
        const gFrom = Number(group.fromFloor) || 0
        const gTo = Number(group.toFloor) || 0
        const gPer = Number(group.unitsPerFloor) || 0
        if (gFrom > 0 && gTo >= gFrom && gPer > 0) {
          for (let floor = gFrom; floor <= gTo; floor++) {
            for (let u = 0; u < gPer; u++) {
              if (sampleUnits.length < maxSampleUnits) {
                sampleUnits.push(generateUnitNumber(unitPattern, i, floor, u, globalIdx, unitSeparator, group.unitPrefix || undefined))
              }
              globalIdx++
              total++
            }
          }
        }
      }

      item.sampleUnits = sampleUnits
      item.totalUnits = total
    }

    preview.push(item)
  }

  return preview
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

export function BulkBuildingGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
  initialConfig,
}: BulkBuildingGeneratorModalProps) {
  const { t } = useTranslation()

  const form = useForm<BulkBuildingFormValues>({
    defaultValues: {
      prefix: 'Torre',
      count: '3',
      codePrefix: 'T',
      unitSeparator: '-',
    },
  })

  const [selectedNamePattern, setSelectedNamePattern] = useState<TNamingPattern>('prefix_letter')
  const [codeEnabled, setCodeEnabled] = useState(false)
  const [selectedCodePattern, setSelectedCodePattern] = useState<TCodePattern>('padded_number')
  const [generateUnitsEnabled, setGenerateUnitsEnabled] = useState(false)
  const [selectedUnitPattern, setSelectedUnitPattern] = useState<TUnitNamingPattern>('floor_letter')
  const [floorGroups, setFloorGroups] = useState<TFloorGroup[]>([createDefaultFloorGroup()])
  const [floorGroupError, setFloorGroupError] = useState<string | null>(null)
  const [aliquotMode, setAliquotMode] = useState<TAliquotMode>('none')

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        form.reset({
          prefix: initialConfig.prefix,
          count: initialConfig.count,
          codePrefix: initialConfig.codePrefix,
          unitSeparator: initialConfig.unitSeparator,
        })
        setSelectedNamePattern(initialConfig.namePattern)
        setCodeEnabled(initialConfig.codeEnabled)
        setSelectedCodePattern(initialConfig.codePattern)
        setGenerateUnitsEnabled(initialConfig.generateUnitsEnabled)
        setSelectedUnitPattern(initialConfig.unitPattern)
        setFloorGroups(initialConfig.floorGroups.map((g) => ({ ...g, id: crypto.randomUUID() })))
        setAliquotMode(initialConfig.aliquotMode ?? 'none')
      } else {
        form.reset({
          prefix: 'Torre',
          count: '3',
          codePrefix: 'T',
          unitSeparator: '-',
        })
        setSelectedNamePattern('prefix_letter')
        setCodeEnabled(false)
        setSelectedCodePattern('padded_number')
        setGenerateUnitsEnabled(false)
        setSelectedUnitPattern('floor_letter')
        setFloorGroups([createDefaultFloorGroup()])
        setAliquotMode('none')
      }
      setFloorGroupError(null)
    }
  }, [isOpen, form, initialConfig])

  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name) form.clearErrors(name)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const watchValues = form.watch()
  const prefix = watchValues.prefix || 'Torre'
  const count = Math.max(0, Number(watchValues.count) || 0)
  const codePrefix = watchValues.codePrefix || ''
  const unitSeparator = watchValues.unitSeparator || '-'

  const totalUnits = generateUnitsEnabled
    ? count *
      floorGroups.reduce((sum, g) => {
        const from = Number(g.fromFloor) || 0
        const to = Number(g.toFloor) || 0
        const perFloor = Number(g.unitsPerFloor) || 0
        const floors = Math.max(0, to - from + 1)
        return sum + floors * perFloor
      }, 0)
    : 0

  const preview = generatePreview(
    prefix,
    count,
    selectedNamePattern,
    codeEnabled,
    codePrefix,
    selectedCodePattern,
    generateUnitsEnabled,
    floorGroups,
    selectedUnitPattern,
    unitSeparator
  )

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  const addFloorGroup = useCallback(() => {
    setFloorGroups((prev) => {
      const lastGroup = prev[prev.length - 1]
      const nextFrom = lastGroup ? (Number(lastGroup.toFloor) || 0) + 1 : 1
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          fromFloor: String(nextFrom),
          toFloor: String(nextFrom),
          unitsPerFloor: '4',
          unitPrefix: '',
          areaM2: '',
          bedrooms: '',
          bathrooms: '',
          parkingSpaces: '',
          aliquotPercentage: '',
        },
      ]
    })
    setFloorGroupError(null)
  }, [])

  const removeFloorGroup = useCallback((id: string) => {
    setFloorGroups((prev) => prev.filter((g) => g.id !== id))
    setFloorGroupError(null)
  }, [])

  const updateFloorGroup = useCallback((id: string, updates: Partial<Omit<TFloorGroup, 'id'>>) => {
    setFloorGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)))
    setFloorGroupError(null)
  }, [])

  const handleGenerate = useCallback(() => {
    const values = form.getValues()
    let hasError = false

    if (!values.prefix || values.prefix.trim() === '') {
      form.setError('prefix', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.bulkBuildings.prefixRequired',
      })
      hasError = true
    }

    const countNum = Number(values.count)
    if (!values.count || isNaN(countNum) || countNum < 1) {
      form.setError('count', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.bulkBuildings.countRequired',
      })
      hasError = true
    }
    if ((selectedNamePattern === 'prefix_letter' || selectedNamePattern === 'letter_only') && countNum > 26) {
      form.setError('count', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.bulkBuildings.maxLetterBuildings',
      })
      hasError = true
    }
    if (selectedCodePattern === 'letter' && countNum > 26) {
      form.setError('count', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.bulkBuildings.maxLetterBuildings',
      })
      hasError = true
    }

    if (generateUnitsEnabled) {
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
        if (
          (selectedUnitPattern === 'floor_letter' || selectedUnitPattern === 'bldg_floor_letter') &&
          gPer > 26
        ) {
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

      if (aliquotMode === 'by_area') {
        const missingArea = floorGroups.some((g) => !g.areaM2 || Number(g.areaM2) <= 0)
        if (missingArea) {
          setFloorGroupError('superadmin.condominiums.wizard.bulk.aliquotByAreaMissingArea')
          hasError = true
        }
      }
    }

    if (hasError) return

    // Derive floorsCount from floor groups
    const derivedFloorsCount = generateUnitsEnabled
      ? Math.max(...floorGroups.map((g) => Number(g.toFloor) || 0))
      : null

    const generatedBuildings: Omit<TLocalBuilding, 'tempId'>[] = []
    const unitsPerBuilding: Omit<TLocalUnit, 'tempId' | 'buildingTempId'>[][] = []

    for (let i = 0; i < countNum; i++) {
      generatedBuildings.push({
        name: generateBuildingName(values.prefix.trim(), selectedNamePattern, i),
        code: codeEnabled
          ? generateBuildingCode(values.codePrefix.trim(), selectedCodePattern, i)
          : null,
        floorsCount: derivedFloorsCount,
      })

      if (generateUnitsEnabled) {
        const sep = values.unitSeparator || '-'
        const buildingUnits: Omit<TLocalUnit, 'tempId' | 'buildingTempId'>[] = []
        let globalIdx = 0

        // First pass: collect units and their areas for by_area calculation
        const unitEntries: { group: TFloorGroup; floor: number; unitIndex: number; globalIdx: number }[] = []
        const sortedGroups = [...floorGroups].sort((a, b) => (Number(a.fromFloor) || 0) - (Number(b.fromFloor) || 0))
        for (const group of sortedGroups) {
          const gFrom = Number(group.fromFloor) || 0
          const gTo = Number(group.toFloor) || 0
          const gPer = Number(group.unitsPerFloor) || 0
          for (let floor = gFrom; floor <= gTo; floor++) {
            for (let u = 0; u < gPer; u++) {
              unitEntries.push({ group, floor, unitIndex: u, globalIdx })
              globalIdx++
            }
          }
        }

        // Calculate total area per building for by_area mode
        const totalArea = aliquotMode === 'by_area'
          ? unitEntries.reduce((sum, e) => sum + (Number(e.group.areaM2) || 0), 0)
          : 0

        // Total units per building for equal mode
        const unitsPerBldg = unitEntries.length

        // Second pass: generate units
        for (const entry of unitEntries) {
          let unitAliquot: string | null = null
          if (aliquotMode === 'equal' && unitsPerBldg > 0) {
            unitAliquot = (100 / (unitsPerBldg * countNum)).toFixed(4)
          } else if (aliquotMode === 'by_area' && totalArea > 0) {
            const unitArea = Number(entry.group.areaM2) || 0
            unitAliquot = ((unitArea / totalArea) * 100).toFixed(4)
          } else if (aliquotMode === 'custom') {
            unitAliquot = entry.group.aliquotPercentage || null
          }

          buildingUnits.push({
            unitNumber: generateUnitNumber(selectedUnitPattern, i, entry.floor, entry.unitIndex, entry.globalIdx, sep, entry.group.unitPrefix || undefined),
            floor: entry.floor,
            areaM2: entry.group.areaM2 || null,
            bedrooms: entry.group.bedrooms ? Number(entry.group.bedrooms) : null,
            bathrooms: entry.group.bathrooms ? Number(entry.group.bathrooms) : null,
            parkingSpaces: entry.group.parkingSpaces ? Number(entry.group.parkingSpaces) : undefined,
            parkingIdentifiers: null,
            storageIdentifier: null,
            aliquotPercentage: unitAliquot,
          })
        }
        unitsPerBuilding.push(buildingUnits)
      } else {
        unitsPerBuilding.push([])
      }
    }

    onGenerate({
      buildings: generatedBuildings,
      unitsPerBuilding,
      config: {
        prefix: values.prefix,
        count: values.count,
        floorsCount: derivedFloorsCount ? String(derivedFloorsCount) : '',
        codePrefix: values.codePrefix,
        unitSeparator: values.unitSeparator || '-',
        namePattern: selectedNamePattern,
        codeEnabled,
        codePattern: selectedCodePattern,
        generateUnitsEnabled,
        unitPattern: selectedUnitPattern,
        floorGroups: floorGroups.map(({ id, ...rest }) => ({ id, ...rest })),
        aliquotMode,
      },
    })
    onClose()
  }, [
    form,
    selectedNamePattern,
    codeEnabled,
    selectedCodePattern,
    generateUnitsEnabled,
    selectedUnitPattern,
    floorGroups,
    aliquotMode,
    totalUnits,
    onGenerate,
    onClose,
  ])

  const namePatterns: { value: TNamingPattern; label: string; example: string }[] = [
    {
      value: 'prefix_letter',
      label: t('superadmin.condominiums.wizard.bulkBuildings.patternPrefixLetter'),
      example: `${prefix} A, ${prefix} B, ${prefix} C...`,
    },
    {
      value: 'prefix_number',
      label: t('superadmin.condominiums.wizard.bulkBuildings.patternPrefixNumber'),
      example: `${prefix} 1, ${prefix} 2, ${prefix} 3...`,
    },
    {
      value: 'letter_only',
      label: t('superadmin.condominiums.wizard.bulkBuildings.patternLetterOnly'),
      example: 'A, B, C, D...',
    },
    {
      value: 'number_only',
      label: t('superadmin.condominiums.wizard.bulkBuildings.patternNumberOnly'),
      example: '1, 2, 3, 4...',
    },
  ]

  const codePatterns: { value: TCodePattern; label: string; example: string }[] = [
    {
      value: 'padded_number',
      label: t('superadmin.condominiums.wizard.bulkBuildings.codePatternNumber'),
      example: `${codePrefix}-001, ${codePrefix}-002, ${codePrefix}-003...`,
    },
    {
      value: 'letter',
      label: t('superadmin.condominiums.wizard.bulkBuildings.codePatternLetter'),
      example: `${codePrefix}-A, ${codePrefix}-B, ${codePrefix}-C...`,
    },
    {
      value: 'triple_letter',
      label: t('superadmin.condominiums.wizard.bulkBuildings.codePatternTripleLetter'),
      example: `${codePrefix}-AAA, ${codePrefix}-AAB, ${codePrefix}-AAC...`,
    },
  ]

  const s = unitSeparator
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
      value: 'bldg_sequential',
      label: t('superadmin.condominiums.wizard.bulk.patternBldgSequential'),
      example: `A${s}1, A${s}2, ..., B${s}1, B${s}2...`,
    },
    {
      value: 'bldg_floor_number',
      label: t('superadmin.condominiums.wizard.bulk.patternBldgFloorNumber'),
      example: `A${s}1${s}1, A${s}1${s}2, A${s}2${s}1...`,
    },
    {
      value: 'bldg_floor_letter',
      label: t('superadmin.condominiums.wizard.bulk.patternBldgFloorLetter'),
      example: `A${s}1A, A${s}1B, A${s}2A...`,
    },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col">
            <span>{t('superadmin.condominiums.wizard.bulkBuildings.title')}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <FormProvider {...form}>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name="prefix"
                  label={t('superadmin.condominiums.wizard.bulkBuildings.prefix')}
                  placeholder="Torre"
                  isRequired
                  translateError={translateError}
                />
                <InputField
                  name="count"
                  label={t('superadmin.condominiums.wizard.bulkBuildings.count')}
                  type="number"
                  inputMode="numeric"
                  isRequired
                  translateError={translateError}
                />
              </div>

              <div>
                <Typography variant="subtitle2" className="font-medium mb-3">
                  {t('superadmin.condominiums.wizard.bulkBuildings.namingPattern')}
                </Typography>
                <div className="flex flex-col gap-2">
                  {namePatterns.map((p) => (
                    <PatternButton
                      key={p.value}
                      value={p.value}
                      label={p.label}
                      example={p.example}
                      selected={selectedNamePattern === p.value}
                      onSelect={setSelectedNamePattern}
                    />
                  ))}
                </div>
              </div>

              <Divider />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5">
                    <Typography variant="subtitle2" className="font-medium">
                      {t('superadmin.condominiums.wizard.bulkBuildings.codeConfig')}
                    </Typography>
                    <Tooltip content={t('superadmin.condominiums.wizard.bulkBuildings.codeConfigHint')} placement="right" showArrow classNames={{ content: 'max-w-xs text-sm' }}>
                      <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
                    </Tooltip>
                  </span>
                  <Switch size="sm" color="success" isSelected={codeEnabled} onValueChange={setCodeEnabled} />
                </div>

                {codeEnabled && (
                  <div className="flex flex-col gap-4 mt-4 p-4 rounded-lg border border-success/30 bg-success/5">
                    <InputField
                      name="codePrefix"
                      label={t('superadmin.condominiums.wizard.bulkBuildings.codePrefix')}
                      placeholder="T"
                      translateError={translateError}
                    />
                    <div className="flex flex-col gap-2">
                      {codePatterns.map((p) => (
                        <PatternButton
                          key={p.value}
                          value={p.value}
                          label={p.label}
                          example={p.example}
                          selected={selectedCodePattern === p.value}
                          onSelect={setSelectedCodePattern}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

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

                {generateUnitsEnabled && (
                  <div className="flex flex-col gap-5 mt-4 p-4 rounded-lg border border-success/30 bg-success/5">
                    {/* Unit Naming Pattern */}
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

                    {/* Aliquot Percentage — before floor groups */}
                    <div>
                      <span className="flex items-center gap-1.5 mb-3">
                        <Typography variant="subtitle2" className="font-medium">
                          {t('superadmin.condominiums.wizard.bulk.aliquot')}
                        </Typography>
                        <Tooltip content={t('superadmin.condominiums.wizard.bulk.aliquotHint')} placement="right" showArrow classNames={{ content: 'max-w-xs text-sm' }}>
                          <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
                        </Tooltip>
                      </span>
                      <div className="flex flex-col gap-2">
                        <PatternButton
                          value="none"
                          label={t('superadmin.condominiums.wizard.bulk.aliquotNone')}
                          example={t('superadmin.condominiums.wizard.bulk.aliquotNoneHint')}
                          selected={aliquotMode === 'none'}
                          onSelect={() => setAliquotMode('none')}
                        />
                        <PatternButton
                          value="equal"
                          label={t('superadmin.condominiums.wizard.bulk.aliquotEqual')}
                          example={totalUnits > 0
                            ? t('superadmin.condominiums.wizard.bulk.aliquotEqualHint', { percentage: (100 / totalUnits).toFixed(4) })
                            : t('superadmin.condominiums.wizard.bulk.aliquotEqualHint', { percentage: '—' })}
                          selected={aliquotMode === 'equal'}
                          onSelect={() => setAliquotMode('equal')}
                        />
                        <PatternButton
                          value="by_area"
                          label={t('superadmin.condominiums.wizard.bulk.aliquotByArea')}
                          example={t('superadmin.condominiums.wizard.bulk.aliquotByAreaHint')}
                          selected={aliquotMode === 'by_area'}
                          onSelect={() => setAliquotMode('by_area')}
                        />
                        <PatternButton
                          value="custom"
                          label={t('superadmin.condominiums.wizard.bulk.aliquotCustom')}
                          example={t('superadmin.condominiums.wizard.bulk.aliquotCustomHint')}
                          selected={aliquotMode === 'custom'}
                          onSelect={() => setAliquotMode('custom')}
                        />
                      </div>
                    </div>

                    <Divider />

                    {/* Floor Groups */}
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
                              {/* Row 1: Floor range + units per floor */}
                              <div className="grid grid-cols-3 gap-3">
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
                              </div>
                              {/* Row 2: Prefix + Properties */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Input
                                  size="sm"
                                  label={t('superadmin.condominiums.wizard.bulk.unitPrefix')}
                                  placeholder={t('common.optional')}
                                  value={group.unitPrefix}
                                  onValueChange={(v) => updateFloorGroup(group.id, { unitPrefix: v })}
                                />
                                <Input
                                  size="sm"
                                  label={t('superadmin.condominiums.detail.units.form.area')}
                                  placeholder="m²"
                                  value={group.areaM2}
                                  isRequired={aliquotMode === 'by_area'}
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
                              </div>
                              {/* Row 3: Parking + Aliquot (if custom) */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Input
                                  size="sm"
                                  type="number"
                                  label={t('superadmin.condominiums.detail.units.form.parkingSpaces')}
                                  value={group.parkingSpaces}
                                  onValueChange={(v) => updateFloorGroup(group.id, { parkingSpaces: v })}
                                />
                                {aliquotMode === 'custom' && (
                                  <Input
                                    size="sm"
                                    label={t('superadmin.condominiums.wizard.bulk.aliquot')}
                                    placeholder="%"
                                    value={group.aliquotPercentage}
                                    onValueChange={(v) => updateFloorGroup(group.id, { aliquotPercentage: v })}
                                  />
                                )}
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
                  </div>
                )}
              </div>

              <Divider />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="subtitle2" className="font-medium">
                    {t('superadmin.condominiums.wizard.bulk.preview')}
                  </Typography>
                  <div className="flex gap-3">
                    <Typography variant="caption" className="text-default-500">
                      {count} {t('superadmin.condominiums.wizard.steps.buildings').toLowerCase()}
                    </Typography>
                    {generateUnitsEnabled && totalUnits > 0 && (
                      <Typography variant="caption" className="text-success-600 font-medium">
                        {totalUnits} {t('superadmin.condominiums.wizard.units.label')}
                      </Typography>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {preview.map((item, i) => (
                    <div key={i} className="px-3 py-2 rounded-md bg-default-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-default-700">{item.name}</span>
                        <span className="text-xs text-default-400 font-mono">{item.code}</span>
                        {generateUnitsEnabled && item.totalUnits != null && item.totalUnits > 0 && (
                          <span className="text-xs text-success-600 ml-auto">
                            {item.totalUnits} {t('superadmin.condominiums.wizard.units.label')}
                          </span>
                        )}
                      </div>
                      {item.sampleUnits && item.sampleUnits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.sampleUnits.map((u, j) => (
                            <span
                              key={j}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-default-200 text-default-600 font-mono"
                            >
                              {u}
                            </span>
                          ))}
                          {item.totalUnits != null && item.totalUnits > item.sampleUnits.length && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded text-default-400">
                              +{item.totalUnits - item.sampleUnits.length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {count > preview.length && (
                    <span className="px-3 py-2 text-xs rounded-md bg-default-50 text-default-400">
                      +{count - preview.length} {t('superadmin.condominiums.wizard.bulk.more')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </FormProvider>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button color="success" onPress={handleGenerate} isDisabled={count === 0}>
            {t('superadmin.condominiums.wizard.bulkBuildings.generate', { count })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
