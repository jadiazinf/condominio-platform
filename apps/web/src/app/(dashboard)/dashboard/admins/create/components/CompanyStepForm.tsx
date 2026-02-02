'use client'

import { useFormContext, Controller } from 'react-hook-form'
import type { TCreateManagementCompanyWithAdminForm } from '@packages/domain'
import { Tooltip } from '@/ui/components/tooltip'
import { Info } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { InputField } from '@/ui/components/input'
import { TaxIdInputField } from '@/ui/components/tax-id-input'
import { PhoneInputField } from '@/ui/components/phone-input'
import { LocationSelector } from '@/ui/components/location-selector'
import { Typography } from '@/ui/components/typography'

interface CompanyStepFormProps {
  translateError: (message: string | undefined) => string | undefined
  shouldShowError: (fieldPath: string) => boolean
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

export function CompanyStepForm({ translateError, shouldShowError }: CompanyStepFormProps) {
  const { t } = useTranslation()
  const { control, formState: { errors } } = useFormContext<TCreateManagementCompanyWithAdminForm>()
  const companyErrors = errors?.company

  return (
    <div className="space-y-14">
      {/* Company Information Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.companies.form.companySection.title')}
          tooltip={t('superadmin.companies.form.companySection.description')}
        />

        <div className="flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10">
          <InputField
            name="company.name"
            isRequired
            tooltip={t('superadmin.companies.form.fields.nameDescription')}
            label={t('superadmin.companies.form.fields.name')}
            placeholder={t('superadmin.companies.form.fields.namePlaceholder')}
            translateError={translateError}
            errorMessage={shouldShowError('company.name') ? translateError(companyErrors?.name?.message) : undefined}
          />

          <InputField
            name="company.legalName"
            isRequired
            tooltip={t('superadmin.companies.form.fields.legalNameDescription')}
            label={t('superadmin.companies.form.fields.legalName')}
            placeholder={t('superadmin.companies.form.fields.legalNamePlaceholder')}
            translateError={translateError}
            errorMessage={shouldShowError('company.legalName') ? translateError(companyErrors?.legalName?.message) : undefined}
          />
          <TaxIdInputField
            taxIdTypeFieldName="company.taxIdType"
            taxIdNumberFieldName="company.taxIdNumber"
            label={t('superadmin.companies.form.fields.taxId')}
            tooltip={t('superadmin.companies.form.fields.taxIdDescription')}
            typePlaceholder={t('superadmin.companies.form.fields.taxIdTypePlaceholder')}
            numberPlaceholder={t('superadmin.companies.form.fields.taxIdNumberPlaceholder')}
            isRequired
            translateError={translateError}
          />
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.companies.form.contactSection.title')}
          tooltip={t('superadmin.companies.form.contactSection.description')}
        />

        <div className="flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10">
          <InputField
            name="company.email"
            type="email"
            isRequired
            tooltip={t('superadmin.companies.form.fields.emailDescription')}
            label={t('superadmin.companies.form.fields.email')}
            placeholder={t('superadmin.companies.form.fields.emailPlaceholder')}
            translateError={translateError}
            errorMessage={shouldShowError('company.email') ? translateError(companyErrors?.email?.message) : undefined}
          />

          <PhoneInputField
            countryCodeFieldName="company.phoneCountryCode"
            phoneNumberFieldName="company.phone"
            label={t('superadmin.companies.form.fields.phone')}
            tooltip={t('superadmin.companies.form.fields.phoneDescription')}
            placeholder={t('superadmin.companies.form.fields.phonePlaceholder')}
            isRequired
            translateError={translateError}
          />
          <InputField
            name="company.website"
            tooltip={t('superadmin.companies.form.fields.websiteDescription')}
            label={t('superadmin.companies.form.fields.website')}
            placeholder={t('superadmin.companies.form.fields.websitePlaceholder')}
            translateError={translateError}
            errorMessage={shouldShowError('company.website') ? translateError(companyErrors?.website?.message) : undefined}
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.companies.form.addressSection.title')}
          tooltip={t('superadmin.companies.form.addressSection.description')}
        />

        <div className="flex flex-col gap-10">
          <Controller
            control={control}
            name="company.locationId"
            render={({ field }) => (
              <LocationSelector
                value={field.value}
                onChange={(locationId) => field.onChange(locationId)}
                label={t('superadmin.companies.form.fields.location')}
                tooltip={t('superadmin.companies.form.fields.locationDescription')}
                countryLabel={t('superadmin.companies.form.fields.country')}
                countryPlaceholder={t('superadmin.companies.form.fields.countryPlaceholder')}
                provinceLabel={t('superadmin.companies.form.fields.province')}
                provincePlaceholder={t('superadmin.companies.form.fields.provincePlaceholder')}
                cityLabel={t('superadmin.companies.form.fields.city')}
                cityPlaceholder={t('superadmin.companies.form.fields.cityPlaceholder')}
                errorMessage={shouldShowError('company.locationId') ? translateError(companyErrors?.locationId?.message) : undefined}
                isRequired
              />
            )}
          />

          <InputField
            name="company.address"
            isRequired
            tooltip={t('superadmin.companies.form.fields.addressDescription')}
            label={t('superadmin.companies.form.fields.address')}
            placeholder={t('superadmin.companies.form.fields.addressPlaceholder')}
            translateError={translateError}
            errorMessage={shouldShowError('company.address') ? translateError(companyErrors?.address?.message) : undefined}
          />
        </div>
      </div>
    </div>
  )
}
