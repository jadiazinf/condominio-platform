'use client'

import { useCallback, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Button } from '@heroui/button'

import { useTranslation } from '@/contexts'
import { UnitForm } from '@/app/(dashboard)/dashboard/condominiums/[id]/buildings/components/UnitForm'
import type { TLocalUnit } from '../hooks/useCreateCondominiumWizard'
import type { TCreateUnitVariables } from '@packages/http-client/hooks'

interface UnitEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<TLocalUnit, 'tempId'>) => void
  buildingTempId: string
  buildingName: string
  editingUnit?: TLocalUnit | null
}

export function UnitEditorModal({
  isOpen,
  onClose,
  onSave,
  buildingTempId,
  buildingName,
  editingUnit,
}: UnitEditorModalProps) {
  const { t } = useTranslation()
  const isEditing = !!editingUnit

  const form = useForm<TCreateUnitVariables>({
    defaultValues: {
      buildingId: '',
      unitNumber: '',
      floor: undefined,
      areaM2: '',
      bedrooms: undefined,
      bathrooms: undefined,
      parkingSpaces: undefined,
      parkingIdentifiers: undefined,
      storageIdentifier: '',
      aliquotPercentage: '',
    },
  })

  // Reset form values when modal opens (for editing or adding)
  useEffect(() => {
    if (isOpen) {
      form.reset(
        editingUnit
          ? {
              buildingId: '',
              unitNumber: editingUnit.unitNumber,
              floor: editingUnit.floor ?? undefined,
              areaM2: editingUnit.areaM2 ?? '',
              bedrooms: editingUnit.bedrooms ?? undefined,
              bathrooms: editingUnit.bathrooms ?? undefined,
              parkingSpaces: editingUnit.parkingSpaces ?? undefined,
              parkingIdentifiers: editingUnit.parkingIdentifiers ?? undefined,
              storageIdentifier: editingUnit.storageIdentifier ?? '',
              aliquotPercentage: editingUnit.aliquotPercentage ?? '',
            }
          : {
              buildingId: '',
              unitNumber: '',
              floor: undefined,
              areaM2: '',
              bedrooms: undefined,
              bathrooms: undefined,
              parkingSpaces: undefined,
              parkingIdentifiers: undefined,
              storageIdentifier: '',
              aliquotPercentage: '',
            }
      )
    }
  }, [isOpen, editingUnit, form])

  // Clear field errors as the user types
  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name) {
        form.clearErrors(name)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleSave = useCallback(() => {
    const values = form.getValues()
    if (!values.unitNumber || values.unitNumber.trim() === '') {
      form.setError('unitNumber', {
        type: 'manual',
        message: 'superadmin.condominiums.wizard.units.numberRequired',
      })
      return
    }

    onSave({
      buildingTempId,
      unitNumber: values.unitNumber.trim(),
      floor: values.floor ? Number(values.floor) : null,
      areaM2: values.areaM2 || null,
      bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
      bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
      parkingSpaces: values.parkingSpaces ? Number(values.parkingSpaces) : undefined,
      parkingIdentifiers: values.parkingIdentifiers || null,
      storageIdentifier: values.storageIdentifier || null,
      aliquotPercentage: values.aliquotPercentage || null,
    })

    onClose()
  }, [form, onSave, onClose, buildingTempId])

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  const translations = {
    unitNumber: t('superadmin.condominiums.detail.units.form.unitNumber'),
    unitNumberPlaceholder: t('superadmin.condominiums.detail.units.form.unitNumberPlaceholder'),
    floor: t('superadmin.condominiums.detail.units.form.floor'),
    area: t('superadmin.condominiums.detail.units.form.area'),
    bedrooms: t('superadmin.condominiums.detail.units.form.bedrooms'),
    bathrooms: t('superadmin.condominiums.detail.units.form.bathrooms'),
    parkingSpaces: t('superadmin.condominiums.detail.units.form.parkingSpaces'),
    parkingIdentifiers: t('superadmin.condominiums.detail.units.form.parkingIdentifiers'),
    parkingIdentifiersPlaceholder: t('superadmin.condominiums.detail.units.form.parkingIdentifiersPlaceholder'),
    storageIdentifier: t('superadmin.condominiums.detail.units.form.storageIdentifier'),
    aliquotPercentage: t('superadmin.condominiums.detail.units.form.aliquotPercentage'),
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col">
            <span>
              {isEditing
                ? t('superadmin.condominiums.wizard.units.edit')
                : t('superadmin.condominiums.wizard.units.add')}
            </span>
            <span className="text-sm font-normal text-default-500">{buildingName}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <FormProvider {...form}>
            <UnitForm translateError={translateError} translations={translations} />
          </FormProvider>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button color="success" onPress={handleSave}>
            {isEditing ? t('common.save') : t('superadmin.condominiums.wizard.units.add')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
