'use client'

import { Controller } from 'react-hook-form'
import { EIdDocumentTypes } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Input } from '@/ui/components/input'
import { Button } from '@/ui/components/button'
import { PhoneInput } from '@/ui/components/phone-input'
import { DocumentInput } from '@/ui/components/document-input'

import { Section } from '../Section'
import { FormField, FormFieldRow } from '../FormField'
import { useProfileForm } from '../../hooks'

export function ProfileForm() {
  const { t } = useTranslation()
  const {
    user,
    control,
    errors,
    isSubmitting,
    isDirty,
    handleSubmit,
    handleCancel,
    translateError,
  } = useProfileForm()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Basic Info Section */}
      <Section
        title={t('settings.profile.basicInfo')}
        description={t('settings.profile.basicInfoDescription')}
      >
        {/* Name Fields */}
        <FormField>
          <FormFieldRow>
            <Controller
              control={control}
              name="firstName"
              render={({ field }) => (
                <Input
                  label={t('settings.profile.firstName')}
                  placeholder={t('settings.profile.firstNamePlaceholder')}
                  value={field.value || ''}
                  onChange={field.onChange}
                  isInvalid={!!errors.firstName}
                  errorMessage={translateError(errors.firstName?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field }) => (
                <Input
                  label={t('settings.profile.lastName')}
                  placeholder={t('settings.profile.lastNamePlaceholder')}
                  value={field.value || ''}
                  onChange={field.onChange}
                  isInvalid={!!errors.lastName}
                  errorMessage={translateError(errors.lastName?.message)}
                />
              )}
            />
          </FormFieldRow>
        </FormField>

        {/* Email Field */}
        <FormField>
          <Input
            label={t('settings.profile.email')}
            description={t('settings.profile.emailDescription')}
            value={user?.email || ''}
            type="email"
            isReadOnly
          />
        </FormField>

        {/* Phone Field */}
        <FormField>
          <Controller
            control={control}
            name="phoneCountryCode"
            render={({ field: countryCodeField }) => (
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: phoneNumberField }) => (
                  <PhoneInput
                    label={t('settings.profile.phone')}
                    placeholder={t('settings.profile.phonePlaceholder')}
                    countryCode={countryCodeField.value}
                    phoneNumber={phoneNumberField.value}
                    onCountryCodeChange={countryCodeField.onChange}
                    onPhoneNumberChange={phoneNumberField.onChange}
                    countryCodeError={translateError(errors.phoneCountryCode?.message)}
                    phoneNumberError={translateError(errors.phoneNumber?.message)}
                  />
                )}
              />
            )}
          />
        </FormField>
      </Section>

      {/* Identity Document Section */}
      <Section
        title={t('settings.profile.identityDocument')}
        description={t('settings.profile.identityDocumentDescription')}
      >
        <FormField>
          <Controller
            control={control}
            name="idDocumentType"
            render={({ field: typeField }) => (
              <Controller
                control={control}
                name="idDocumentNumber"
                render={({ field: numberField }) => (
                  <DocumentInput
                    label={t('settings.profile.idDocument')}
                    typePlaceholder={t('settings.profile.idDocumentTypePlaceholder')}
                    numberPlaceholder={t('settings.profile.idDocumentNumberPlaceholder')}
                    documentType={typeField.value as (typeof EIdDocumentTypes)[number] | null}
                    documentNumber={numberField.value}
                    onDocumentTypeChange={typeField.onChange}
                    onDocumentNumberChange={numberField.onChange}
                    documentTypeError={translateError(errors.idDocumentType?.message)}
                    documentNumberError={translateError(errors.idDocumentNumber?.message)}
                  />
                )}
              />
            )}
          />
        </FormField>
      </Section>

      {/* Address Section */}
      <Section
        title={t('settings.profile.addressSection')}
        description={t('settings.profile.addressSectionDescription')}
      >
        <FormField>
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Input
                label={t('settings.profile.address')}
                placeholder={t('settings.profile.addressPlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
                isInvalid={!!errors.address}
                errorMessage={translateError(errors.address?.message)}
              />
            )}
          />
        </FormField>
      </Section>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="bordered" onPress={handleCancel} isDisabled={!isDirty || isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button color="primary" type="submit" isLoading={isSubmitting} isDisabled={!isDirty}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
