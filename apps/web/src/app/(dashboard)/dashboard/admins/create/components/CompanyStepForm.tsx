'use client'

import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import type { TCreateManagementCompanyWithAdminForm, TCompanyStep, TTaxIdType } from '@packages/domain'
import { Tooltip } from '@/ui/components/tooltip'
import { Info } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Input } from '@/ui/components/input'
import { TaxIdInput } from '@/ui/components/tax-id-input'
import { PhoneInput } from '@/ui/components/phone-input'
import { LocationSelector } from '@/ui/components/location-selector'
import { Typography } from '@/ui/components/typography'

interface CompanyStepFormProps {
  control: Control<TCreateManagementCompanyWithAdminForm, any, any>
  errors: FieldErrors<TCompanyStep> | undefined
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

export function CompanyStepForm({ control, errors, translateError, shouldShowError }: CompanyStepFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-14">
      {/* Company Information Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.companies.form.companySection.title')}
          tooltip={t('superadmin.companies.form.companySection.description')}
        />

        <div className="flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10">
          <Controller
            control={control}
            name="company.name"
            render={({ field }) => (
              <Input
                isRequired
                tooltip={t('superadmin.companies.form.fields.nameDescription')}
                errorMessage={shouldShowError('company.name') ? translateError(errors?.name?.message) : undefined}
                isInvalid={shouldShowError('company.name') && !!errors?.name}
                label={t('superadmin.companies.form.fields.name')}
                placeholder={t('superadmin.companies.form.fields.namePlaceholder')}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="company.legalName"
            render={({ field }) => (
              <Input
                isRequired
                tooltip={t('superadmin.companies.form.fields.legalNameDescription')}
                errorMessage={shouldShowError('company.legalName') ? translateError(errors?.legalName?.message) : undefined}
                isInvalid={shouldShowError('company.legalName') && !!errors?.legalName}
                label={t('superadmin.companies.form.fields.legalName')}
                placeholder={t('superadmin.companies.form.fields.legalNamePlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="company.taxIdType"
            render={({ field: typeField }) => (
              <Controller
                control={control}
                name="company.taxIdNumber"
                render={({ field: numberField }) => (
                  <TaxIdInput
                    taxIdType={typeField.value as TTaxIdType | null}
                    taxIdNumber={numberField.value}
                    onTaxIdTypeChange={(type) => typeField.onChange(type)}
                    onTaxIdNumberChange={(value) => numberField.onChange(value)}
                    label={t('superadmin.companies.form.fields.taxId')}
                    tooltip={t('superadmin.companies.form.fields.taxIdDescription')}
                    typePlaceholder={t('superadmin.companies.form.fields.taxIdTypePlaceholder')}
                    numberPlaceholder={t('superadmin.companies.form.fields.taxIdNumberPlaceholder')}
                    taxIdTypeError={shouldShowError('company.taxIdType') ? translateError(errors?.taxIdType?.message) : undefined}
                    taxIdNumberError={shouldShowError('company.taxIdNumber') ? translateError(errors?.taxIdNumber?.message) : undefined}
                    isRequired
                  />
                )}
              />
            )}
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
          <Controller
            control={control}
            name="company.email"
            render={({ field }) => (
              <Input
                isRequired
                tooltip={t('superadmin.companies.form.fields.emailDescription')}
                errorMessage={shouldShowError('company.email') ? translateError(errors?.email?.message) : undefined}
                isInvalid={shouldShowError('company.email') && !!errors?.email}
                label={t('superadmin.companies.form.fields.email')}
                placeholder={t('superadmin.companies.form.fields.emailPlaceholder')}
                type="email"
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="company.phoneCountryCode"
            render={({ field: countryCodeField }) => (
              <Controller
                control={control}
                name="company.phone"
                render={({ field: phoneField }) => (
                  <PhoneInput
                    countryCode={countryCodeField.value}
                    phoneNumber={phoneField.value}
                    onCountryCodeChange={(code) => countryCodeField.onChange(code)}
                    onPhoneNumberChange={(value) => phoneField.onChange(value)}
                    label={t('superadmin.companies.form.fields.phone')}
                    tooltip={t('superadmin.companies.form.fields.phoneDescription')}
                    placeholder={t('superadmin.companies.form.fields.phonePlaceholder')}
                    countryCodeError={shouldShowError('company.phoneCountryCode') ? translateError(errors?.phoneCountryCode?.message) : undefined}
                    phoneNumberError={shouldShowError('company.phone') ? translateError(errors?.phone?.message) : undefined}
                    isRequired
                  />
                )}
              />
            )}
          />
          <Controller
            control={control}
            name="company.website"
            render={({ field }) => (
              <Input
                tooltip={t('superadmin.companies.form.fields.websiteDescription')}
                errorMessage={shouldShowError('company.website') ? translateError(errors?.website?.message) : undefined}
                isInvalid={shouldShowError('company.website') && !!errors?.website}
                label={t('superadmin.companies.form.fields.website')}
                placeholder={t('superadmin.companies.form.fields.websitePlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
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
                errorMessage={shouldShowError('company.locationId') ? translateError(errors?.locationId?.message) : undefined}
                isRequired
              />
            )}
          />

          <Controller
            control={control}
            name="company.address"
            render={({ field }) => (
              <Input
                isRequired
                tooltip={t('superadmin.companies.form.fields.addressDescription')}
                errorMessage={shouldShowError('company.address') ? translateError(errors?.address?.message) : undefined}
                isInvalid={shouldShowError('company.address') && !!errors?.address}
                label={t('superadmin.companies.form.fields.address')}
                placeholder={t('superadmin.companies.form.fields.addressPlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}
