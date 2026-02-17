'use client'

import { FormProvider } from 'react-hook-form'

import { useTranslation } from '@/contexts'
import { Input } from '@/ui/components/input'
import { InputField } from '@/ui/components/input'
import { Button } from '@/ui/components/button'
import { PhoneInputField } from '@/ui/components/phone-input'
import { DocumentInputField } from '@/ui/components/document-input'

import { Section } from '../Section'
import { FormField, FormFieldRow } from '../FormField'
import { useProfileForm } from '../../hooks'

export function ProfileForm() {
  const { t } = useTranslation()
  const {
    form,
    user,
    isSubmitting,
    isDirty,
    handleSubmit,
    handleCancel,
    translateError,
  } = useProfileForm()

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Basic Info Section */}
      <Section
        title={t('settings.profile.basicInfo')}
        description={t('settings.profile.basicInfoDescription')}
      >
        {/* Name Fields */}
        <FormField>
          <FormFieldRow>
            <InputField
              name="firstName"
              label={t('settings.profile.firstName')}
              placeholder={t('settings.profile.firstNamePlaceholder')}
              translateError={translateError}
            />
            <InputField
              name="lastName"
              label={t('settings.profile.lastName')}
              placeholder={t('settings.profile.lastNamePlaceholder')}
              translateError={translateError}
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
          <PhoneInputField
            countryCodeFieldName="phoneCountryCode"
            phoneNumberFieldName="phoneNumber"
            label={t('settings.profile.phone')}
            translateError={translateError}
          />
        </FormField>
      </Section>

      {/* Identity Document Section */}
      <Section
        title={t('settings.profile.identityDocument')}
        description={t('settings.profile.identityDocumentDescription')}
      >
        <FormField>
          <DocumentInputField
            documentTypeFieldName="idDocumentType"
            documentNumberFieldName="idDocumentNumber"
            label={t('settings.profile.idDocument')}
            typePlaceholder={t('settings.profile.idDocumentTypePlaceholder')}
            numberPlaceholder={t('settings.profile.idDocumentNumberPlaceholder')}
            translateError={translateError}
          />
        </FormField>
      </Section>

      {/* Address Section */}
      <Section
        title={t('settings.profile.addressSection')}
        description={t('settings.profile.addressSectionDescription')}
      >
        <FormField>
          <InputField
            name="address"
            label={t('settings.profile.address')}
            placeholder={t('settings.profile.addressPlaceholder')}
            translateError={translateError}
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
    </FormProvider>
  )
}
