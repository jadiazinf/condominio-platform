'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TUnit } from '@packages/domain'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { UnitForm } from './UnitForm'
import {
  TCreateUnitVariables,
  TUpdateUnitVariables,
  useCreateUnit,
  useUpdateUnit,
} from '@packages/http-client/hooks'

const unitFormSchema = z.object({
  unitNumber: z.string().min(1, 'required').max(50),
  floor: z.number().int().optional().nullable(),
  areaM2: z.string().optional().nullable(),
  bedrooms: z.number().int().optional().nullable(),
  bathrooms: z.number().int().optional().nullable(),
  parkingSpaces: z.number().int(),
  parkingIdentifiers: z.string().optional().nullable(), // Will be split into array
  storageIdentifier: z.string().max(50).optional().nullable(),
  aliquotPercentage: z.string().optional().nullable(),
})

type TUnitFormValues = z.infer<typeof unitFormSchema>

interface IUnitModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId: string
  unit?: TUnit | null
  translations: {
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
  translateError?: (message: string | undefined) => string | undefined
}

export function UnitModal({
  isOpen,
  onClose,
  buildingId,
  unit,
  translations,
  translateError,
}: IUnitModalProps) {
  const toast = useToast()
  const router = useRouter()
  const isEditing = !!unit

  const methods = useForm<TUnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      unitNumber: '',
      floor: null,
      areaM2: null,
      bedrooms: null,
      bathrooms: null,
      parkingSpaces: 0,
      parkingIdentifiers: null,
      storageIdentifier: null,
      aliquotPercentage: null,
    },
  })

  const createMutation = useCreateUnit({
    onSuccess: () => {
      toast.success(translations.success.created)
      onClose()
      methods.reset()
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.error.create)
    },
  })

  const updateMutation = useUpdateUnit({
    onSuccess: () => {
      toast.success(translations.success.updated)
      onClose()
      methods.reset()
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || translations.error.update)
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  // Reset form when unit changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (unit) {
        methods.reset({
          unitNumber: unit.unitNumber,
          floor: unit.floor,
          areaM2: unit.areaM2,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          parkingSpaces: unit.parkingSpaces ?? 0,
          parkingIdentifiers: unit.parkingIdentifiers?.join(', ') ?? null,
          storageIdentifier: unit.storageIdentifier,
          aliquotPercentage: unit.aliquotPercentage,
        })
      } else {
        methods.reset({
          unitNumber: '',
          floor: null,
          areaM2: null,
          bedrooms: null,
          bathrooms: null,
          parkingSpaces: 0,
          parkingIdentifiers: null,
          storageIdentifier: null,
          aliquotPercentage: null,
        })
      }
    }
  }, [isOpen, unit, methods])

  const handleSubmit = methods.handleSubmit(data => {
    // Parse parking identifiers from comma-separated string
    const parkingIdentifiers = data.parkingIdentifiers
      ? data.parkingIdentifiers
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : null

    if (isEditing && unit) {
      const updateData: TUpdateUnitVariables = {
        unitId: unit.id,
        unitNumber: data.unitNumber,
        floor: data.floor,
        areaM2: data.areaM2,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        parkingSpaces: data.parkingSpaces,
        parkingIdentifiers,
        storageIdentifier: data.storageIdentifier,
        aliquotPercentage: data.aliquotPercentage,
      }
      updateMutation.mutate(updateData)
    } else {
      const createData: TCreateUnitVariables = {
        buildingId,
        unitNumber: data.unitNumber,
        floor: data.floor,
        areaM2: data.areaM2,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        parkingSpaces: data.parkingSpaces,
        parkingIdentifiers,
        storageIdentifier: data.storageIdentifier,
        aliquotPercentage: data.aliquotPercentage,
      }
      createMutation.mutate(createData)
    }
  })

  const handleClose = () => {
    if (!isPending) {
      onClose()
      methods.reset()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              <Typography variant="h4">
                {isEditing ? translations.editTitle : translations.createTitle}
              </Typography>
            </ModalHeader>
            <ModalBody>
              <UnitForm translateError={translateError} translations={translations.form} />
            </ModalBody>
            <ModalFooter>
              <Button variant="bordered" onPress={handleClose} isDisabled={isPending}>
                {translations.cancel}
              </Button>
              <Button type="submit" color="primary" isLoading={isPending}>
                {isPending ? translations.saving : translations.save}
              </Button>
            </ModalFooter>
          </form>
        </FormProvider>
      </ModalContent>
    </Modal>
  )
}
