'use client'

import { FormProvider } from 'react-hook-form'

import { Section } from '../Section'
import { FormField, FormFieldRow } from '../FormField'
import { useProfileForm } from '../../hooks'

import { useTranslation } from '@/contexts'
import { Input } from '@/ui/components/input'
import { InputField } from '@/ui/components/input'
import { Button } from '@/ui/components/button'
import { PhoneInputField } from '@/ui/components/phone-input'
import { DocumentInputField } from '@/ui/components/document-input'

export function ProfileForm() {
  const { t } = useTranslation()
  const { form, user, isSubmitting, isDirty, handleSubmit, handleCancel, translateError } =
    useProfileForm()

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
        {/* Basic Info Section */}
        <Section
          description={t('settings.profile.basicInfoDescription')}
          title={t('settings.profile.basicInfo')}
        >
          {/* Name Fields */}
          <FormField>
            <FormFieldRow>
              <InputField
                label={t('settings.profile.firstName')}
                name="firstName"
                placeholder={t('settings.profile.firstNamePlaceholder')}
                translateError={translateError}
              />
              <InputField
                label={t('settings.profile.lastName')}
                name="lastName"
                placeholder={t('settings.profile.lastNamePlaceholder')}
                translateError={translateError}
              />
            </FormFieldRow>
          </FormField>

          {/* Email Field */}
          <FormField>
            <Input
              isReadOnly
              description={t('settings.profile.emailDescription')}
              label={t('settings.profile.email')}
              type="email"
              value={user?.email || ''}
            />
          </FormField>

          {/* Phone Field */}
          <FormField>
            <PhoneInputField
              countryCodeFieldName="phoneCountryCode"
              label={t('settings.profile.phone')}
              phoneNumberFieldName="phoneNumber"
              translateError={translateError}
            />
          </FormField>
        </Section>

        {/* Identity Document Section */}
        <Section
          description={t('settings.profile.identityDocumentDescription')}
          title={t('settings.profile.identityDocument')}
        >
          <FormField>
            <DocumentInputField
              documentNumberFieldName="idDocumentNumber"
              documentTypeFieldName="idDocumentType"
              label={t('settings.profile.idDocument')}
              numberPlaceholder={t('settings.profile.idDocumentNumberPlaceholder')}
              translateError={translateError}
              typePlaceholder={t('settings.profile.idDocumentTypePlaceholder')}
            />
          </FormField>
        </Section>

        {/* Address Section */}
        <Section
          description={t('settings.profile.addressSectionDescription')}
          title={t('settings.profile.addressSection')}
        >
          <FormField>
            <InputField
              label={t('settings.profile.address')}
              name="address"
              placeholder={t('settings.profile.addressPlaceholder')}
              translateError={translateError}
            />
          </FormField>
        </Section>

        {/* Form Actions */}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            isDisabled={!isDirty || isSubmitting}
            variant="bordered"
            onPress={handleCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="w-full sm:w-auto"
            color="primary"
            isDisabled={!isDirty}
            isLoading={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
