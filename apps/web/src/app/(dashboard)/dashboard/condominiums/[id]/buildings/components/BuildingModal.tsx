'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TBuilding } from '@packages/domain'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { BuildingForm } from './BuildingForm'
import {
  TCreateBuildingVariables,
  TUpdateBuildingVariables,
  useCreateBuilding,
  useUpdateBuilding,
} from '@packages/http-client/hooks'

const buildingFormSchema = z.object({
  name: z.string().min(1, 'required').max(255),
  code: z.string().max(50).optional().nullable(),
  floorsCount: z.number().int().optional().nullable(),
})

type TBuildingFormValues = z.infer<typeof buildingFormSchema>

interface IBuildingModalProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  building?: TBuilding | null
  translations: {
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
  translateError?: (message: string | undefined) => string | undefined
}

export function BuildingModal({
  isOpen,
  onClose,
  condominiumId,
  building,
  translations,
  translateError,
}: IBuildingModalProps) {
  const toast = useToast()
  const router = useRouter()
  const isEditing = !!building

  const methods = useForm<TBuildingFormValues>({
    resolver: zodResolver(buildingFormSchema),
    defaultValues: {
      name: '',
      code: null,
      floorsCount: null,
    },
  })

  const createMutation = useCreateBuilding({
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

  const updateMutation = useUpdateBuilding({
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

  // Reset form when building changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (building) {
        methods.reset({
          name: building.name,
          code: building.code,
          floorsCount: building.floorsCount,
        })
      } else {
        methods.reset({
          name: '',
          code: null,
          floorsCount: null,
        })
      }
    }
  }, [isOpen, building, methods])

  const handleSubmit = methods.handleSubmit(data => {
    if (isEditing && building) {
      const updateData: TUpdateBuildingVariables = {
        buildingId: building.id,
        ...data,
      }
      updateMutation.mutate(updateData)
    } else {
      const createData: TCreateBuildingVariables = {
        condominiumId,
        name: data.name,
        code: data.code,
        floorsCount: data.floorsCount,
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
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              <Typography variant="h4">
                {isEditing ? translations.editTitle : translations.createTitle}
              </Typography>
            </ModalHeader>
            <ModalBody>
              <BuildingForm translateError={translateError} translations={translations.form} />
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
