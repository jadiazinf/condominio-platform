'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormClearErrors,
  type UseFormGetValues,
  type UseFormSetError,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form'
import type { TCreateManagementCompanyWithAdminForm, TAdminStep, TUser } from '@packages/domain'
import { getUserByEmail, HttpError } from '@packages/http-client'
import { Tooltip } from '@heroui/tooltip'
import { RadioGroup, Radio } from '@heroui/radio'
import { Info, Search, User } from 'lucide-react'

import { useAuth, useTranslation } from '@/contexts'
import { Input } from '@/ui/components/input'
import { PhoneInput } from '@/ui/components/phone-input'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'

interface AdminStepFormProps {
  control: Control<TCreateManagementCompanyWithAdminForm, any, any>
  errors: FieldErrors<TAdminStep> | undefined
  getValues: UseFormGetValues<TCreateManagementCompanyWithAdminForm>
  setValue: UseFormSetValue<TCreateManagementCompanyWithAdminForm>
  setError: UseFormSetError<TCreateManagementCompanyWithAdminForm>
  clearErrors: UseFormClearErrors<TCreateManagementCompanyWithAdminForm>
  translateError: (message: string | undefined) => string | undefined
}

function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <Typography variant="subtitle1" className="font-semibold">
        {title}
      </Typography>
      <Tooltip
        content={tooltip}
        placement="right"
        showArrow
        classNames={{
          content: 'max-w-xs text-sm',
        }}
      >
        <Info className="h-4 w-4 text-default-400 cursor-help" />
      </Tooltip>
    </div>
  )
}

export function AdminStepForm({
  control,
  errors,
  getValues,
  setValue,
  setError,
  clearErrors,
  translateError,
}: AdminStepFormProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const toast = useToast()
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TUser | null>(null)

  const adminMode = useWatch({ control, name: 'admin.mode' })
  const adminFirstName = useWatch({ control, name: 'admin.firstName' })
  const adminLastName = useWatch({ control, name: 'admin.lastName' })
  const adminEmail = useWatch({ control, name: 'admin.email' })
  const adminPhoneCountryCode = useWatch({ control, name: 'admin.phoneCountryCode' })
  const adminPhoneNumber = useWatch({ control, name: 'admin.phoneNumber' })

  useEffect(() => {
    if (adminMode === 'new') {
      setSelectedUser(null)
      setValue('admin.existingUserId', null)
      setValue('admin.existingUserEmail', '')
      clearErrors(['admin.existingUserId', 'admin.existingUserEmail'])
    } else if (adminMode === 'existing') {
      clearErrors(['admin.firstName', 'admin.lastName', 'admin.email'])
    }
  }, [adminMode, clearErrors, setValue])

  const selectedUserDisplay = useMemo(() => {
    const fullName = [adminFirstName, adminLastName].filter(Boolean).join(' ')

    return {
      fullName,
      email: adminEmail,
      phone:
        adminPhoneNumber && adminPhoneCountryCode
          ? `${adminPhoneCountryCode} ${adminPhoneNumber}`
          : null,
    }
  }, [adminFirstName, adminLastName, adminEmail, adminPhoneCountryCode, adminPhoneNumber])

  const handleSearchUser = async () => {
    if (!firebaseUser) return

    const email = (getValues('admin.existingUserEmail') || '').trim()

    if (!email) {
      setError('admin.existingUserEmail', {
        type: 'manual',
        message: 'validation.models.auth.email.required',
      })
      return
    }

    try {
      setIsSearching(true)
      const token = await firebaseUser.getIdToken()
      const user = await getUserByEmail(token, email)

      setSelectedUser(user)
      setValue('admin.existingUserId', user.id, { shouldValidate: true })
      setValue('admin.firstName', user.firstName || '')
      setValue('admin.lastName', user.lastName || '')
      setValue('admin.email', user.email || '')
      setValue('admin.phoneCountryCode', user.phoneCountryCode || '+58')
      setValue('admin.phoneNumber', user.phoneNumber || null)
      clearErrors(['admin.existingUserId', 'admin.existingUserEmail'])
    } catch (err) {
      setSelectedUser(null)
      setValue('admin.existingUserId', null)

      if (HttpError.isHttpError(err) && err.status === 404) {
        setError('admin.existingUserId', {
          type: 'manual',
          message: 'superadmin.companies.form.adminSearch.notFound',
        })
      } else if (HttpError.isHttpError(err)) {
        toast.error(err.message)
      } else {
        toast.error(t('superadmin.companies.form.adminSearch.error'))
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedUser(null)
    setValue('admin.existingUserId', null)
    setValue('admin.existingUserEmail', '')
    setValue('admin.firstName', '')
    setValue('admin.lastName', '')
    setValue('admin.email', '')
    setValue('admin.phoneCountryCode', '+58')
    setValue('admin.phoneNumber', null)
  }

  return (
    <div className="space-y-14">
      {/* Admin Information Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.companies.form.adminSection.title')}
          tooltip={t('superadmin.companies.form.adminSection.description')}
        />

        <Controller
          control={control}
          name="admin.mode"
          render={({ field }) => (
            <RadioGroup
              label={t('superadmin.companies.form.adminMode.label')}
              orientation="horizontal"
              value={field.value || 'new'}
              onValueChange={field.onChange}
            >
              <Radio value="new">{t('superadmin.companies.form.adminMode.new')}</Radio>
              <Radio value="existing">{t('superadmin.companies.form.adminMode.existing')}</Radio>
            </RadioGroup>
          )}
        />

        {adminMode === 'existing' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Controller
                control={control}
                name="admin.existingUserEmail"
                render={({ field }) => (
                  <Input
                    isRequired
                    tooltip={t('superadmin.companies.form.adminSearch.description')}
                    errorMessage={translateError(
                      errors?.existingUserEmail?.message || errors?.existingUserId?.message
                    )}
                    isInvalid={!!errors?.existingUserEmail || !!errors?.existingUserId}
                    label={t('superadmin.companies.form.adminSearch.email')}
                    placeholder={t('superadmin.companies.form.adminSearch.emailPlaceholder')}
                    type="email"
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
              <Button
                isLoading={isSearching}
                onPress={handleSearchUser}
                startContent={<Search size={16} />}
                type="button"
              >
                {t('superadmin.companies.form.adminSearch.button')}
              </Button>
            </div>
            {(selectedUser || selectedUserDisplay.email) && (
              <div className="rounded-lg border border-default-200 bg-default-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="text-default-400" size={16} />
                      <Typography variant="subtitle2" className="font-semibold">
                        {t('superadmin.companies.form.adminSearch.selectedTitle')}
                      </Typography>
                    </div>
                    <Typography variant="body2">{selectedUserDisplay.fullName || '-'}</Typography>
                    <Typography color="muted" variant="body2">
                      {selectedUserDisplay.email || '-'}
                    </Typography>
                    {selectedUserDisplay.phone && (
                      <Typography color="muted" variant="body2">
                        {selectedUserDisplay.phone}
                      </Typography>
                    )}
                  </div>
                  <Button size="sm" variant="light" onPress={handleClearSelection} type="button">
                    {t('superadmin.companies.form.adminSearch.clear')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {adminMode !== 'existing' && (
          <div className="flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10">
            <Controller
              control={control}
              name="admin.firstName"
              render={({ field }) => (
                <Input
                  isRequired
                  errorMessage={translateError(errors?.firstName?.message)}
                  isInvalid={!!errors?.firstName}
                  label={t('superadmin.companies.form.fields.adminFirstName')}
                  placeholder={t('superadmin.companies.form.fields.adminFirstNamePlaceholder')}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="admin.lastName"
              render={({ field }) => (
                <Input
                  isRequired
                  errorMessage={translateError(errors?.lastName?.message)}
                  isInvalid={!!errors?.lastName}
                  label={t('superadmin.companies.form.fields.adminLastName')}
                  placeholder={t('superadmin.companies.form.fields.adminLastNamePlaceholder')}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="admin.email"
              render={({ field }) => (
                <Input
                  isRequired
                  tooltip={t('superadmin.companies.form.fields.adminEmailDescription')}
                  errorMessage={translateError(errors?.email?.message)}
                  isInvalid={!!errors?.email}
                  label={t('superadmin.companies.form.fields.adminEmail')}
                  placeholder={t('superadmin.companies.form.fields.adminEmailPlaceholder')}
                  type="email"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="admin.phoneCountryCode"
              render={({ field: countryCodeField }) => (
                <Controller
                  control={control}
                  name="admin.phoneNumber"
                  render={({ field: phoneNumberField }) => (
                    <PhoneInput
                      countryCode={countryCodeField.value || '+58'}
                      countryCodeError={translateError(errors?.phoneCountryCode?.message)}
                      label={t('superadmin.companies.form.fields.adminPhone')}
                      phoneNumber={phoneNumberField.value || ''}
                      phoneNumberError={translateError(errors?.phoneNumber?.message)}
                      placeholder={t('superadmin.companies.form.fields.adminPhonePlaceholder')}
                      onCountryCodeChange={countryCodeField.onChange}
                      onPhoneNumberChange={phoneNumberField.onChange}
                    />
                  )}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
