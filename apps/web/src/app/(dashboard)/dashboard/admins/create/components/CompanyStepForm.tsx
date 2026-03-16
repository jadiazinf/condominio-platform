'use client'

import type { TCreateManagementCompanyWithAdminForm } from '@packages/domain'

import { useFormContext, Controller } from 'react-hook-form'
import { Info } from 'lucide-react'

import { Tooltip } from '@/ui/components/tooltip'
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

export function CompanyStepForm({ translateError, shouldShowError }: CompanyStepFormProps) {
  const { t } = useTranslation()
  const {
    control,
    formState: { errors },
  } = useFormContext<TCreateManagementCompanyWithAdminForm>()
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
            isRequired
            errorMessage={
              shouldShowError('company.name')
                ? translateError(companyErrors?.name?.message)
                : undefined
            }
            label={t('superadmin.companies.form.fields.name')}
            name="company.name"
            placeholder={t('superadmin.companies.form.fields.namePlaceholder')}
            tooltip={t('superadmin.companies.form.fields.nameDescription')}
            translateError={translateError}
          />

          <InputField
            isRequired
            errorMessage={
              shouldShowError('company.legalName')
                ? translateError(companyErrors?.legalName?.message)
                : undefined
            }
            label={t('superadmin.companies.form.fields.legalName')}
            name="company.legalName"
            placeholder={t('superadmin.companies.form.fields.legalNamePlaceholder')}
            tooltip={t('superadmin.companies.form.fields.legalNameDescription')}
            translateError={translateError}
          />
          <TaxIdInputField
            isRequired
            label={t('superadmin.companies.form.fields.taxId')}
            numberPlaceholder={t('superadmin.companies.form.fields.taxIdNumberPlaceholder')}
            taxIdNumberFieldName="company.taxIdNumber"
            taxIdTypeFieldName="company.taxIdType"
            tooltip={t('superadmin.companies.form.fields.taxIdDescription')}
            translateError={translateError}
            typePlaceholder={t('superadmin.companies.form.fields.taxIdTypePlaceholder')}
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
            isRequired
            errorMessage={
              shouldShowError('company.email')
                ? translateError(companyErrors?.email?.message)
                : undefined
            }
            label={t('superadmin.companies.form.fields.email')}
            name="company.email"
            placeholder={t('superadmin.companies.form.fields.emailPlaceholder')}
            tooltip={t('superadmin.companies.form.fields.emailDescription')}
            translateError={translateError}
            type="email"
          />

          <PhoneInputField
            isRequired
            countryCodeFieldName="company.phoneCountryCode"
            label={t('superadmin.companies.form.fields.phone')}
            phoneNumberFieldName="company.phone"
            tooltip={t('superadmin.companies.form.fields.phoneDescription')}
            translateError={translateError}
          />
          <InputField
            errorMessage={
              shouldShowError('company.website')
                ? translateError(companyErrors?.website?.message)
                : undefined
            }
            label={t('superadmin.companies.form.fields.website')}
            name="company.website"
            placeholder={t('superadmin.companies.form.fields.websitePlaceholder')}
            tooltip={t('superadmin.companies.form.fields.websiteDescription')}
            translateError={translateError}
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
                isRequired
                cityLabel={t('superadmin.companies.form.fields.city')}
                cityPlaceholder={t('superadmin.companies.form.fields.cityPlaceholder')}
                countryLabel={t('superadmin.companies.form.fields.country')}
                countryPlaceholder={t('superadmin.companies.form.fields.countryPlaceholder')}
                errorMessage={
                  shouldShowError('company.locationId')
                    ? translateError(companyErrors?.locationId?.message)
                    : undefined
                }
                label={t('superadmin.companies.form.fields.location')}
                provinceLabel={t('superadmin.companies.form.fields.province')}
                provincePlaceholder={t('superadmin.companies.form.fields.provincePlaceholder')}
                tooltip={t('superadmin.companies.form.fields.locationDescription')}
                value={field.value}
                onChange={locationId => field.onChange(locationId)}
              />
            )}
          />

          <InputField
            isRequired
            errorMessage={
              shouldShowError('company.address')
                ? translateError(companyErrors?.address?.message)
                : undefined
            }
            label={t('superadmin.companies.form.fields.address')}
            name="company.address"
            placeholder={t('superadmin.companies.form.fields.addressPlaceholder')}
            tooltip={t('superadmin.companies.form.fields.addressDescription')}
            translateError={translateError}
          />
        </div>
      </div>
    </div>
  )
}
