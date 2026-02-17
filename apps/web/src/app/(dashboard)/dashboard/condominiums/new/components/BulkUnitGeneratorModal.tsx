'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Button } from '@heroui/button'
import { Divider } from '@heroui/divider'

import { useTranslation } from '@/contexts'
import { InputField } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import type { TLocalUnit } from '../hooks/useCreateCondominiumWizard'

type TNamingPattern = 'floor_letter' | 'floor_sequence' | 'sequential'

interface BulkUnitGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (units: Omit<TLocalUnit, 'tempId'>[]) => void
  buildingTempId: string
  buildingName: string
  buildingFloors?: number | null
}

interface BulkGeneratorFormValues {
  floorFrom: string
  floorTo: string
  unitsPerFloor: string
  namingPattern: TNamingPattern
  areaM2: string
  bedrooms: string
  bathrooms: string
  parkingSpaces: string
}

function generateUnitNumber(
  pattern: TNamingPattern,
  floor: number,
  unitIndex: number,
  _unitsPerFloor: number
): string {
  switch (pattern) {
    case 'floor_letter': {
      const letter = String.fromCharCode(65 + unitIndex) // A, B, C, D...
      return `${floor}${letter}`
    }
    case 'floor_sequence': {
      const seq = String(unitIndex + 1).padStart(2, '0')
      return `${floor}${seq}`
    }
    case 'sequential': {
      const seq = String(unitIndex + 1).padStart(2, '0')
      return `${floor}${seq}`
    }
    default:
      return `${floor}${String(unitIndex + 1).padStart(2, '0')}`
  }
}

function generatePreview(
  floorFrom: number,
  floorTo: number,
  unitsPerFloor: number,
  pattern: TNamingPattern
): string[] {
  const preview: string[] = []
  const maxPreview = 12

  for (let floor = floorFrom; floor <= floorTo && preview.length < maxPreview; floor++) {
    for (let unit = 0; unit < unitsPerFloor && preview.length < maxPreview; unit++) {
      preview.push(generateUnitNumber(pattern, floor, unit, unitsPerFloor))
    }
  }

  return preview
}

export function BulkUnitGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
  buildingTempId,
  buildingName,
  buildingFloors,
}: BulkUnitGeneratorModalProps) {
  const { t } = useTranslation()

  const form = useForm<BulkGeneratorFormValues>({
    defaultValues: {
      floorFrom: '1',
      floorTo: buildingFloors?.toString() ?? '1',
      unitsPerFloor: '4',
      namingPattern: 'floor_letter',
      areaM2: '',
      bedrooms: '',
      bathrooms: '',
      parkingSpaces: '',
    },
  })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        floorFrom: '1',
        floorTo: buildingFloors?.toString() ?? '1',
        unitsPerFloor: '4',
        namingPattern: 'floor_letter',
        areaM2: '',
        bedrooms: '',
        bathrooms: '',
        parkingSpaces: '',
      })
    }
  }, [isOpen, buildingFloors, form])

  // Clear errors on change
  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name) form.clearErrors(name)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const [selectedPattern, setSelectedPattern] = useState<TNamingPattern>('floor_letter')

  const watchValues = form.watch()
  const floorFrom = Number(watchValues.floorFrom) || 1
  const floorTo = Number(watchValues.floorTo) || 1
  const unitsPerFloor = Number(watchValues.unitsPerFloor) || 1
  const totalUnits = Math.max(0, floorTo - floorFrom + 1) * unitsPerFloor

  const preview = generatePreview(floorFrom, floorTo, unitsPerFloor, selectedPattern)

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  const handleGenerate = useCallback(() => {
    const values = form.getValues()
    let hasError = false

    const from = Number(values.floorFrom)
    const to = Number(values.floorTo)
    const perFloor = Number(values.unitsPerFloor)

    if (!values.floorFrom || isNaN(from) || from < 0) {
      form.setError('floorFrom', { type: 'manual', message: 'superadmin.condominiums.wizard.bulk.floorFromRequired' })
      hasError = true
    }
    if (!values.floorTo || isNaN(to) || to < 0) {
      form.setError('floorTo', { type: 'manual', message: 'superadmin.condominiums.wizard.bulk.floorToRequired' })
      hasError = true
    }
    if (from > to) {
      form.setError('floorTo', { type: 'manual', message: 'superadmin.condominiums.wizard.bulk.floorRangeError' })
      hasError = true
    }
    if (!values.unitsPerFloor || isNaN(perFloor) || perFloor < 1) {
      form.setError('unitsPerFloor', { type: 'manual', message: 'superadmin.condominiums.wizard.bulk.unitsPerFloorRequired' })
      hasError = true
    }
    if (selectedPattern === 'floor_letter' && perFloor > 26) {
      form.setError('unitsPerFloor', { type: 'manual', message: 'superadmin.condominiums.wizard.bulk.maxLetterUnits' })
      hasError = true
    }

    if (hasError) return

    const generatedUnits: Omit<TLocalUnit, 'tempId'>[] = []

    for (let floor = from; floor <= to; floor++) {
      for (let unitIdx = 0; unitIdx < perFloor; unitIdx++) {
        generatedUnits.push({
          buildingTempId,
          unitNumber: generateUnitNumber(selectedPattern, floor, unitIdx, perFloor),
          floor,
          areaM2: values.areaM2 || null,
          bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
          bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
          parkingSpaces: values.parkingSpaces ? Number(values.parkingSpaces) : undefined,
          parkingIdentifiers: null,
          storageIdentifier: null,
          aliquotPercentage: null,
        })
      }
    }

    onGenerate(generatedUnits)
    onClose()
  }, [form, selectedPattern, buildingTempId, onGenerate, onClose])

  const patterns: { value: TNamingPattern; label: string; example: string }[] = [
    {
      value: 'floor_letter',
      label: t('superadmin.condominiums.wizard.bulk.patternFloorLetter'),
      example: '1A, 1B, 1C, 2A, 2B...',
    },
    {
      value: 'floor_sequence',
      label: t('superadmin.condominiums.wizard.bulk.patternFloorSequence'),
      example: '101, 102, 103, 201, 202...',
    },
    {
      value: 'sequential',
      label: t('superadmin.condominiums.wizard.bulk.patternSequential'),
      example: '101, 102, 201, 202...',
    },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col">
            <span>{t('superadmin.condominiums.wizard.bulk.title')}</span>
            <span className="text-sm font-normal text-default-500">{buildingName}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <FormProvider {...form}>
            <div className="flex flex-col gap-6">
              {/* Floor Range */}
              <div>
                <Typography variant="subtitle2" className="font-medium mb-3">
                  {t('superadmin.condominiums.wizard.bulk.floorRange')}
                </Typography>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="floorFrom"
                    label={t('superadmin.condominiums.wizard.bulk.floorFrom')}
                    type="number"
                    inputMode="numeric"
                    isRequired
                    translateError={translateError}
                  />
                  <InputField
                    name="floorTo"
                    label={t('superadmin.condominiums.wizard.bulk.floorTo')}
                    type="number"
                    inputMode="numeric"
                    isRequired
                    translateError={translateError}
                  />
                </div>
              </div>

              {/* Units per floor */}
              <InputField
                name="unitsPerFloor"
                label={t('superadmin.condominiums.wizard.bulk.unitsPerFloor')}
                type="number"
                inputMode="numeric"
                isRequired
                translateError={translateError}
              />

              {/* Naming Pattern */}
              <div>
                <Typography variant="subtitle2" className="font-medium mb-3">
                  {t('superadmin.condominiums.wizard.bulk.namingPattern')}
                </Typography>
                <div className="flex flex-col gap-2">
                  {patterns.map((pattern) => (
                    <button
                      key={pattern.value}
                      type="button"
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                        selectedPattern === pattern.value
                          ? 'border-success bg-success/10'
                          : 'border-default-200 hover:border-default-400'
                      }`}
                      onClick={() => setSelectedPattern(pattern.value)}
                    >
                      <div>
                        <Typography variant="body2" className="font-medium">
                          {pattern.label}
                        </Typography>
                        <Typography variant="caption" className="text-default-400">
                          {pattern.example}
                        </Typography>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedPattern === pattern.value ? 'border-success' : 'border-default-300'
                        }`}
                      >
                        {selectedPattern === pattern.value && (
                          <div className="w-2 h-2 rounded-full bg-success" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Default values for all units */}
              <div>
                <Typography variant="subtitle2" className="font-medium mb-3">
                  {t('superadmin.condominiums.wizard.bulk.defaultValues')}
                </Typography>
                <Typography variant="caption" className="text-default-400 mb-3 block">
                  {t('superadmin.condominiums.wizard.bulk.defaultValuesHint')}
                </Typography>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                  <InputField
                    name="areaM2"
                    label={t('superadmin.condominiums.detail.units.form.area')}
                    translateError={translateError}
                  />
                  <InputField
                    name="bedrooms"
                    label={t('superadmin.condominiums.detail.units.form.bedrooms')}
                    type="number"
                    translateError={translateError}
                  />
                  <InputField
                    name="bathrooms"
                    label={t('superadmin.condominiums.detail.units.form.bathrooms')}
                    type="number"
                    translateError={translateError}
                  />
                  <InputField
                    name="parkingSpaces"
                    label={t('superadmin.condominiums.detail.units.form.parkingSpaces')}
                    type="number"
                    translateError={translateError}
                  />
                </div>
              </div>

              <Divider />

              {/* Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="subtitle2" className="font-medium">
                    {t('superadmin.condominiums.wizard.bulk.preview')}
                  </Typography>
                  <Typography variant="caption" className="text-default-500">
                    {totalUnits} {t('superadmin.condominiums.wizard.units.label')}
                  </Typography>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.map((name, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs rounded-md bg-default-100 text-default-700 font-mono"
                    >
                      {name}
                    </span>
                  ))}
                  {totalUnits > preview.length && (
                    <span className="px-2.5 py-1 text-xs rounded-md bg-default-50 text-default-400">
                      +{totalUnits - preview.length} {t('superadmin.condominiums.wizard.bulk.more')}
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
          <Button color="success" onPress={handleGenerate} isDisabled={totalUnits === 0}>
            {t('superadmin.condominiums.wizard.bulk.generate', { count: totalUnits })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
