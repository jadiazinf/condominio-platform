'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { useCreateUnitOwnership } from '@packages/http-client/hooks'

const ownershipFormSchema = z.object({
  fullName: z.string().min(1, 'required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  ownershipType: z.enum(['owner', 'co-owner', 'tenant', 'family_member', 'authorized']),
  ownershipPercentage: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, 'required'),
  isPrimaryResidence: z.boolean(),
})

type TOwnershipFormValues = z.infer<typeof ownershipFormSchema>

interface AddOwnershipModalProps {
  isOpen: boolean
  onClose: () => void
  unitId: string
  translations: {
    title: string
    cancel: string
    save: string
    saving: string
    form: {
      fullName: string
      email: string
      phone: string
      ownershipType: string
      ownershipPercentage: string
      startDate: string
      isPrimaryResidence: string
    }
    ownershipTypes: Record<string, string>
    success: { created: string }
    error: { create: string }
  }
}

export function AddOwnershipModal({ isOpen, onClose, unitId, translations: t }: AddOwnershipModalProps) {
  const toast = useToast()
  const router = useRouter()

  const methods = useForm<TOwnershipFormValues>({
    resolver: zodResolver(ownershipFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      ownershipType: 'owner',
      ownershipPercentage: '',
      startDate: '',
      isPrimaryResidence: false,
    },
  })

  const createMutation = useCreateUnitOwnership({
    onSuccess: () => {
      toast.success(t.success.created)
      onClose()
      methods.reset()
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || t.error.create)
    },
  })

  const isPending = createMutation.isPending

  useEffect(() => {
    if (isOpen) {
      methods.reset({
        fullName: '',
        email: '',
        phone: '',
        ownershipType: 'owner',
        ownershipPercentage: '',
        startDate: '',
        isPrimaryResidence: false,
      })
    }
  }, [isOpen, methods])

  const handleSubmit = methods.handleSubmit(data => {
    createMutation.mutate({
      unitId,
      userId: null,
      fullName: data.fullName,
      email: data.email || null,
      phone: data.phone || null,
      phoneCountryCode: null,
      isRegistered: false,
      ownershipType: data.ownershipType,
      ownershipPercentage: data.ownershipPercentage || null,
      titleDeedNumber: null,
      titleDeedDate: null,
      startDate: data.startDate,
      endDate: null,
      isActive: true,
      isPrimaryResidence: data.isPrimaryResidence,
      metadata: null,
    })
  })

  const handleClose = () => {
    if (!isPending) {
      onClose()
      methods.reset()
    }
  }

  const ownershipTypeOptions = [
    { key: 'owner', label: t.ownershipTypes.owner || 'Propietario' },
    { key: 'co-owner', label: t.ownershipTypes['co-owner'] || 'Copropietario' },
    { key: 'tenant', label: t.ownershipTypes.tenant || 'Inquilino' },
    { key: 'family_member', label: t.ownershipTypes.family_member || 'Familiar' },
    { key: 'authorized', label: t.ownershipTypes.authorized || 'Autorizado' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <Typography variant="h4">{t.title}</Typography>
          </ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label={t.form.fullName}
              isRequired
              value={methods.watch('fullName')}
              onChange={(e) => methods.setValue('fullName', e.target.value)}
              isInvalid={!!methods.formState.errors.fullName}
              errorMessage={methods.formState.errors.fullName?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t.form.email}
                type="email"
                value={methods.watch('email')}
                onChange={(e) => methods.setValue('email', e.target.value)}
                isInvalid={!!methods.formState.errors.email}
                errorMessage={methods.formState.errors.email?.message}
              />
              <Input
                label={t.form.phone}
                value={methods.watch('phone')}
                onChange={(e) => methods.setValue('phone', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t.form.ownershipType}
                items={ownershipTypeOptions}
                selectedKeys={[methods.watch('ownershipType')]}
                onChange={(key) => {
                  if (key) methods.setValue('ownershipType', key as TOwnershipFormValues['ownershipType'])
                }}
                isInvalid={!!methods.formState.errors.ownershipType}
                errorMessage={methods.formState.errors.ownershipType?.message}
              />
              <Input
                label={t.form.ownershipPercentage}
                type="number"
                value={methods.watch('ownershipPercentage')}
                onChange={(e) => methods.setValue('ownershipPercentage', e.target.value)}
                endContent={<span className="text-default-400 text-sm">%</span>}
              />
            </div>
            <Input
              label={t.form.startDate}
              type="date"
              isRequired
              value={methods.watch('startDate')}
              onChange={(e) => methods.setValue('startDate', e.target.value)}
              isInvalid={!!methods.formState.errors.startDate}
              errorMessage={methods.formState.errors.startDate?.message}
            />
            <Switch
              size="sm"
              isSelected={methods.watch('isPrimaryResidence')}
              onValueChange={(val) => methods.setValue('isPrimaryResidence', val)}
            >
              {t.form.isPrimaryResidence}
            </Switch>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={handleClose} isDisabled={isPending}>
              {t.cancel}
            </Button>
            <Button type="submit" color="primary" isLoading={isPending}>
              {isPending ? t.saving : t.save}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
