'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUpdateManagementCompany } from '@packages/http-client'
import {
  managementCompanyUpdateSchema,
  type TManagementCompany,
  type TManagementCompanyUpdate,
} from '@packages/domain'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { LocationSelector } from '@/ui/components/location-selector/LocationSelector'
import { PhoneInputField } from '@/ui/components/phone-input/PhoneInputField'
import { getSessionCookie } from '@/libs/cookies/session-cookie'

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
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={handleClose}>
      <ModalContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>
              <Typography variant="h3">{t('superadmin.companies.actions.edit')}</Typography>
            </ModalHeader>
            <ModalBody className="gap-6">
              {/* Información Básica */}
              <div className="space-y-5">
                <Typography className="text-default-700" variant="h4">
                  {t('superadmin.companies.detail.general.basicInfo')}
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Input
                        {...field}
                        isRequired
                        errorMessage={
                          errors.name?.message ? t(errors.name.message as any) : undefined
                        }
                        label={t('superadmin.companies.form.fields.name')}
                        placeholder={t('superadmin.companies.form.fields.namePlaceholder')}
                        value={field.value || ''}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="legalName"
                    render={({ field }) => (
                      <Input
                        {...field}
                        errorMessage={
                          errors.legalName?.message ? t(errors.legalName.message as any) : undefined
                        }
                        label={t('superadmin.companies.form.fields.legalName')}
                        placeholder={t('superadmin.companies.form.fields.legalNamePlaceholder')}
                        value={field.value || ''}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-5">
                <Typography className="text-default-700" variant="h4">
                  {t('superadmin.companies.detail.general.contactInfo')}
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <Input
                        {...field}
                        errorMessage={
                          errors.email?.message ? t(errors.email.message as any) : undefined
                        }
                        label={t('superadmin.companies.form.fields.email')}
                        placeholder={t('superadmin.companies.form.fields.emailPlaceholder')}
                        type="email"
                        value={field.value || ''}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="website"
                    render={({ field }) => (
                      <Input
                        {...field}
                        errorMessage={
                          errors.website?.message ? t(errors.website.message as any) : undefined
                        }
                        label={t('superadmin.companies.form.fields.website')}
                        placeholder={t('superadmin.companies.form.fields.websitePlaceholder')}
                        type="url"
                        value={field.value || ''}
                      />
                    )}
                  />
                </div>

                <PhoneInputField
                  countryCodeFieldName="phoneCountryCode"
                  label={t('superadmin.companies.form.fields.phone')}
                  phoneNumberFieldName="phone"
                  translateError={message => (message ? t(message as any) : undefined)}
                />

                <Controller
                  control={control}
                  name="locationId"
                  render={({ field }) => (
                    <LocationSelector
                      errorMessage={
                        errors.locationId?.message ? t(errors.locationId.message as any) : undefined
                      }
                      label={t('superadmin.companies.form.fields.location')}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <div className="!mt-10">
                  <Controller
                    control={control}
                    name="address"
                    render={({ field }) => (
                      <Input
                        {...field}
                        errorMessage={
                          errors.address?.message ? t(errors.address.message as any) : undefined
                        }
                        label={t('superadmin.companies.form.fields.address')}
                        placeholder={t('superadmin.companies.form.fields.addressPlaceholder')}
                        value={field.value || ''}
                      />
                    )}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button isDisabled={isSubmitting} variant="light" onPress={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button color="primary" isLoading={isSubmitting} type="submit">
                {t('common.save')}
              </Button>
            </ModalFooter>
          </form>
        </FormProvider>
      </ModalContent>
    </Modal>
  )
}
