'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useUpdateManagementCompany } from '@packages/http-client'
import { LocationSelector } from '@/ui/components/location-selector/LocationSelector'
import { PhoneInputField } from '@/ui/components/phone-input/PhoneInputField'
import { getSessionCookie } from '@/libs/cookies/session-cookie'
import {
  managementCompanyUpdateSchema,
  type TManagementCompany,
  type TManagementCompanyUpdate,
} from '@packages/domain'

interface EditCompanyFormProps {
  isOpen: boolean
  onClose: () => void
  company: TManagementCompany
  onSuccess: () => void
}

export function EditCompanyForm({ isOpen, onClose, company, onSuccess }: EditCompanyFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [token, setToken] = useState('')

  // Get token only on client side
  useEffect(() => {
    setToken(getSessionCookie() || '')
  }, [])

  const methods = useForm<TManagementCompanyUpdate>({
    resolver: zodResolver(managementCompanyUpdateSchema),
    defaultValues: {
      name: company.name,
      legalName: company.legalName,
      email: company.email,
      phoneCountryCode: company.phoneCountryCode,
      phone: company.phone,
      website: company.website,
      address: company.address,
      locationId: company.locationId,
    },
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = methods

  const updateMutation = useUpdateManagementCompany({ token })

  const onSubmit = async (data: TManagementCompanyUpdate) => {
    try {
      await updateMutation.mutateAsync({
        id: company.id,
        ...data,
      })

      toast.success(t('superadmin.companies.actions.updateSuccess'))
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(t('superadmin.companies.actions.updateError'))
      console.error('Error updating company:', error)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>
              <Typography variant="h3">{t('superadmin.companies.actions.edit')}</Typography>
            </ModalHeader>
            <ModalBody className="gap-6">
              {/* Información Básica */}
              <div className="space-y-5">
                <Typography variant="h4" className="text-default-700">
                  {t('superadmin.companies.detail.general.basicInfo')}
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        label={t('superadmin.companies.form.fields.name')}
                        placeholder={t('superadmin.companies.form.fields.namePlaceholder')}
                        errorMessage={errors.name?.message ? t(errors.name.message as any) : undefined}
                        isRequired
                      />
                    )}
                  />

                  <Controller
                    name="legalName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        label={t('superadmin.companies.form.fields.legalName')}
                        placeholder={t('superadmin.companies.form.fields.legalNamePlaceholder')}
                        errorMessage={errors.legalName?.message ? t(errors.legalName.message as any) : undefined}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-5">
                <Typography variant="h4" className="text-default-700">
                  {t('superadmin.companies.detail.general.contactInfo')}
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="email"
                        label={t('superadmin.companies.form.fields.email')}
                        placeholder={t('superadmin.companies.form.fields.emailPlaceholder')}
                        errorMessage={errors.email?.message ? t(errors.email.message as any) : undefined}
                      />
                    )}
                  />

                  <Controller
                    name="website"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="url"
                        label={t('superadmin.companies.form.fields.website')}
                        placeholder={t('superadmin.companies.form.fields.websitePlaceholder')}
                        errorMessage={errors.website?.message ? t(errors.website.message as any) : undefined}
                      />
                    )}
                  />
                </div>

                <PhoneInputField
                  countryCodeFieldName="phoneCountryCode"
                  phoneNumberFieldName="phone"
                  label={t('superadmin.companies.form.fields.phone')}
                  placeholder={t('superadmin.companies.form.fields.phonePlaceholder')}
                  translateError={(message) => (message ? t(message as any) : undefined)}
                />

                <Controller
                  name="locationId"
                  control={control}
                  render={({ field }) => (
                    <LocationSelector
                      label={t('superadmin.companies.form.fields.location')}
                      value={field.value}
                      onChange={field.onChange}
                      errorMessage={errors.locationId?.message ? t(errors.locationId.message as any) : undefined}
                    />
                  )}
                />

                <div className="!mt-10">
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        label={t('superadmin.companies.form.fields.address')}
                        placeholder={t('superadmin.companies.form.fields.addressPlaceholder')}
                        errorMessage={errors.address?.message ? t(errors.address.message as any) : undefined}
                      />
                    )}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={handleClose} isDisabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button color="primary" type="submit" isLoading={isSubmitting}>
                {t('common.save')}
              </Button>
            </ModalFooter>
          </form>
        </FormProvider>
      </ModalContent>
    </Modal>
  )
}
