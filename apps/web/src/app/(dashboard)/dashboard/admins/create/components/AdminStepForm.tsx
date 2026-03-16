'use client'

import type { TCreateManagementCompanyWithAdminForm, TUser } from '@packages/domain'

import { useEffect, useMemo, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { getUserByEmail, HttpError } from '@packages/http-client'
import { Info, Search, User } from 'lucide-react'

import { Tooltip } from '@/ui/components/tooltip'
import { RadioGroup, Radio } from '@/ui/components/radio'
import { useAuth, useTranslation } from '@/contexts'
import { InputField } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import { UserBasicInfoFields } from '@/ui/components/forms'

interface AdminStepFormProps {
  translateError: (message: string | undefined) => string | undefined
  shouldShowError: (fieldPath: string) => boolean
}

function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <Typography className="font-semibold" variant="subtitle1">
        {title}
      </Typography>
      <Tooltip
        showArrow
        classNames={{
          content: 'max-w-xs text-sm',
        }}
        content={tooltip}
        placement="right"
      >
        <Info className="h-4 w-4 text-default-400 cursor-help" />
      </Tooltip>
    </div>
  )
}

export function AdminStepForm({ translateError, shouldShowError }: AdminStepFormProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const toast = useToast()
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TUser | null>(null)

  const {
    control,
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<TCreateManagementCompanyWithAdminForm>()

  const adminMode = watch('admin.mode')
  const adminFirstName = watch('admin.firstName')
  const adminLastName = watch('admin.lastName')
  const adminEmail = watch('admin.email')
  const adminPhoneCountryCode = watch('admin.phoneCountryCode')
  const adminPhoneNumber = watch('admin.phoneNumber')

  const adminErrors = errors?.admin

  useEffect(() => {
    if (adminMode === 'new') {
      setSelectedUser(null)
      setValue('admin.existingUserId', null)
      setValue('admin.existingUserEmail', '')
      // Set default document type to V (Venezolano)
      setValue('admin.idDocumentType' as any, 'V')
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <InputField
                isRequired
                errorMessage={translateError(
                  adminErrors?.existingUserEmail?.message || adminErrors?.existingUserId?.message
                )}
                label={t('superadmin.companies.form.adminSearch.email')}
                name="admin.existingUserEmail"
                placeholder={t('superadmin.companies.form.adminSearch.emailPlaceholder')}
                tooltip={t('superadmin.companies.form.adminSearch.description')}
                translateError={translateError}
                type="email"
              />
              <Button
                className="sm:mt-6"
                isLoading={isSearching}
                startContent={<Search size={16} />}
                type="button"
                onPress={handleSearchUser}
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
                      <Typography className="font-semibold" variant="subtitle2">
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
                  <Button type="button" variant="light" onPress={handleClearSelection}>
                    {t('superadmin.companies.form.adminSearch.clear')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {adminMode !== 'existing' && (
          <UserBasicInfoFields
            fieldPrefix="admin."
            labels={{
              email: t('superadmin.companies.form.fields.adminEmail'),
              emailPlaceholder: t('superadmin.companies.form.fields.adminEmailPlaceholder'),
              emailTooltip: t('superadmin.companies.form.fields.adminEmailDescription'),
              firstName: t('superadmin.companies.form.fields.adminFirstName'),
              firstNamePlaceholder: t('superadmin.companies.form.fields.adminFirstNamePlaceholder'),
              lastName: t('superadmin.companies.form.fields.adminLastName'),
              lastNamePlaceholder: t('superadmin.companies.form.fields.adminLastNamePlaceholder'),
              phone: t('superadmin.companies.form.fields.adminPhone'),
              idDocument: t('superadmin.companies.form.fields.adminIdDocument'),
              idDocumentTypePlaceholder: t(
                'superadmin.companies.form.fields.adminIdDocumentTypePlaceholder'
              ),
              idDocumentNumberPlaceholder: t(
                'superadmin.companies.form.fields.adminIdDocumentNumberPlaceholder'
              ),
              idDocumentTooltip: t('superadmin.companies.form.fields.adminIdDocumentDescription'),
            }}
            showDocumentFields={true}
            translateError={translateError}
          />
        )}
      </div>
    </div>
  )
}
