'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/ui/components/button'
import { useAuth, useTranslation } from '@/contexts'
import { createUserWithInvitation, useRoleByName, useAddMember } from '@packages/http-client/hooks'
import { useToast } from '@/ui/components/toast'
import { UserBasicInfoFields } from '@/ui/components/forms'

const formSchema = z.object({
  email: z.string().min(1, 'superadmin.users.create.validation.email.required').email('superadmin.users.create.validation.email.invalid'),
  firstName: z.string().min(1, 'superadmin.users.create.validation.firstName.required'),
  lastName: z.string().min(1, 'superadmin.users.create.validation.lastName.required'),
  phoneCountryCode: z.string().min(1, 'superadmin.users.create.validation.phoneCountryCode.required'),
  phoneNumber: z.string().min(1, 'superadmin.users.create.validation.phoneNumber.required'),
  idDocumentType: z.enum(['CI', 'RIF', 'Pasaporte'], { message: 'superadmin.users.create.validation.idDocumentType.required' }),
  idDocumentNumber: z.string().min(1, 'superadmin.users.create.validation.idDocumentNumber.required'),
})

type TFormData = z.infer<typeof formSchema>

const ADMIN_PERMISSIONS = {
  can_change_subscription: true,
  can_manage_members: true,
  can_create_tickets: true,
  can_view_invoices: true,
}

interface CreateMemberUserFormProps {
  companyId: string
  onSuccess: () => void
  onClose: () => void
}

export function CreateMemberUserForm({ companyId, onSuccess, onClose }: CreateMemberUserFormProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phoneCountryCode: '+58',
      phoneNumber: '',
      idDocumentType: 'CI',
      idDocumentNumber: '',
    },
  })

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Get USER role for creating the user
  const { data: userRoleData } = useRoleByName({
    token,
    roleName: 'USER',
    enabled: !!token,
  })

  const { mutateAsync: addMember } = useAddMember(companyId)

  const handleSubmit = async (data: TFormData) => {
    if (!token || !userRoleData?.data?.id) {
      toast.error(t('superadmin.companies.detail.members.error.config'))
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Create the user with invitation
      const displayName = `${data.firstName} ${data.lastName}`.trim()
      const result = await createUserWithInvitation(token, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName,
        phoneCountryCode: data.phoneCountryCode || null,
        phoneNumber: data.phoneNumber || null,
        idDocumentType: data.idDocumentType || null,
        idDocumentNumber: data.idDocumentNumber || null,
        roleId: userRoleData.data.id,
        condominiumId: null,
        expirationDays: 7,
      })

      // 2. Add user as member to the management company
      await addMember({
        userId: result.user.id,
        role: 'admin',
        permissions: ADMIN_PERMISSIONS,
        isPrimary: false,
      })

      toast.success(t('superadmin.companies.detail.members.success.created'))
      onSuccess()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string }
      const errorMessage = err?.response?.data?.error || err.message || t('superadmin.companies.detail.members.error.create')
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
        <UserBasicInfoFields
          translateError={translateError}
          labels={{
            email: t('superadmin.users.create.fields.email'),
            emailPlaceholder: t('superadmin.users.create.fields.emailPlaceholder'),
            emailTooltip: t('superadmin.users.create.fields.emailDescription'),
            firstName: t('superadmin.users.create.fields.firstName'),
            firstNamePlaceholder: t('superadmin.users.create.fields.firstNamePlaceholder'),
            firstNameTooltip: t('superadmin.users.create.fields.firstNameDescription'),
            lastName: t('superadmin.users.create.fields.lastName'),
            lastNamePlaceholder: t('superadmin.users.create.fields.lastNamePlaceholder'),
            lastNameTooltip: t('superadmin.users.create.fields.lastNameDescription'),
            phone: t('superadmin.users.create.fields.phone'),
            phonePlaceholder: t('superadmin.users.create.fields.phoneNumberPlaceholder'),
            phoneTooltip: t('superadmin.users.create.fields.phoneDescription'),
            idDocument: t('superadmin.users.create.fields.idDocument'),
            idDocumentTypePlaceholder: t('superadmin.users.create.fields.idDocumentTypePlaceholder'),
            idDocumentNumberPlaceholder: t('superadmin.users.create.fields.idDocumentNumberPlaceholder'),
            idDocumentTooltip: t('superadmin.users.create.fields.idDocumentDescription'),
          }}
          showDocumentFields={true}
        />

        <p className="text-sm text-default-500">
          {t('superadmin.companies.detail.members.modal.inviteNote')}
        </p>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="flat" type="button" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            color="primary"
            type="submit"
            isLoading={isSubmitting}
          >
            {t('superadmin.companies.detail.members.modal.createAndAdd')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
