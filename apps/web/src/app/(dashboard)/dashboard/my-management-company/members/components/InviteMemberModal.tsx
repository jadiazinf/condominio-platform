'use client'

import { useCallback } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Select, type ISelectItem } from '@/ui/components/select'
import { useTranslation } from '@/contexts'
import { useMyCompanyInviteMember } from '@packages/http-client'
import { useToast } from '@/ui/components/toast'
import { UserBasicInfoFields } from '@/ui/components/forms'

const formSchema = z.object({
  email: z
    .string()
    .min(1, 'admin.company.myCompany.members.invite.validation.emailRequired')
    .email('admin.company.myCompany.members.invite.validation.emailInvalid'),
  firstName: z
    .string()
    .min(1, 'admin.company.myCompany.members.invite.validation.firstNameRequired'),
  lastName: z.string().min(1, 'admin.company.myCompany.members.invite.validation.lastNameRequired'),
  phoneCountryCode: z
    .string()
    .min(1, 'admin.company.myCompany.members.invite.validation.phoneRequired'),
  phoneNumber: z.string().min(1, 'admin.company.myCompany.members.invite.validation.phoneRequired'),
  idDocumentType: z.enum(['J', 'G', 'V', 'E', 'P'], {
    message: 'admin.company.myCompany.members.invite.validation.idDocumentRequired',
  }),
  idDocumentNumber: z
    .string()
    .min(1, 'admin.company.myCompany.members.invite.validation.idDocumentRequired'),
  memberRole: z.enum(['admin', 'accountant', 'support', 'viewer'], {
    message: 'admin.company.myCompany.members.invite.validation.roleRequired',
  }),
})

type TFormData = z.infer<typeof formSchema>

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  managementCompanyId: string
  onSuccess: () => void
}

export function InviteMemberModal({
  isOpen,
  onClose,
  managementCompanyId,
  onSuccess,
}: InviteMemberModalProps) {
  const { t } = useTranslation()
  const toast = useToast()

  const form = useForm<TFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phoneCountryCode: '+58',
      phoneNumber: '',
      idDocumentType: 'V',
      idDocumentNumber: '',
      memberRole: 'admin',
    },
  })

  const { mutateAsync: inviteMember, isPending } = useMyCompanyInviteMember(managementCompanyId, {
    onSuccess: () => {
      toast.success(t('admin.company.myCompany.members.invite.success'))
      form.reset()
      onSuccess()
      onClose()
    },
    onError: error => {
      toast.error(error.message || t('admin.company.myCompany.members.invite.error'))
    },
  })

  const handleSubmit = async (data: TFormData) => {
    await inviteMember({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneCountryCode: data.phoneCountryCode,
      phoneNumber: data.phoneNumber,
      idDocumentType: data.idDocumentType,
      idDocumentNumber: data.idDocumentNumber,
      memberRole: data.memberRole,
    })
  }

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  const roleItems: ISelectItem[] = [
    { key: 'admin', label: t('common.roles.admin') },
    { key: 'accountant', label: t('common.roles.accountant') },
    { key: 'support', label: t('common.roles.support') },
    { key: 'viewer', label: t('common.roles.viewer') },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>{t('admin.company.myCompany.members.invite.title')}</ModalHeader>
        <ModalBody className="pb-6">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
              <UserBasicInfoFields
                translateError={translateError}
                labels={{
                  email: t('admin.company.myCompany.members.invite.fields.email'),
                  emailPlaceholder: t(
                    'admin.company.myCompany.members.invite.fields.emailPlaceholder'
                  ),
                  firstName: t('admin.company.myCompany.members.invite.fields.firstName'),
                  firstNamePlaceholder: t(
                    'admin.company.myCompany.members.invite.fields.firstNamePlaceholder'
                  ),
                  lastName: t('admin.company.myCompany.members.invite.fields.lastName'),
                  lastNamePlaceholder: t(
                    'admin.company.myCompany.members.invite.fields.lastNamePlaceholder'
                  ),
                  phone: t('admin.company.myCompany.members.invite.fields.phone'),
                  idDocument: t('admin.company.myCompany.members.invite.fields.idDocument'),
                  idDocumentTypePlaceholder: t(
                    'admin.company.myCompany.members.invite.fields.idDocumentTypePlaceholder'
                  ),
                  idDocumentNumberPlaceholder: t(
                    'admin.company.myCompany.members.invite.fields.idDocumentNumberPlaceholder'
                  ),
                }}
                showDocumentFields={true}
              />

              <Select
                aria-label={t('admin.company.myCompany.members.invite.fields.role')}
                className="w-full mt-10"
                items={roleItems}
                value={form.watch('memberRole')}
                onChange={key => {
                  if (key) form.setValue('memberRole', key as TFormData['memberRole'])
                }}
                label={t('admin.company.myCompany.members.invite.fields.role')}
                variant="bordered"
              />

              <p className="text-sm text-default-500">
                {t('admin.company.myCompany.members.invite.inviteNote')}
              </p>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="flat" type="button" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button color="primary" type="submit" isLoading={isPending}>
                  {t('admin.company.myCompany.members.invite.submit')}
                </Button>
              </div>
            </form>
          </FormProvider>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
