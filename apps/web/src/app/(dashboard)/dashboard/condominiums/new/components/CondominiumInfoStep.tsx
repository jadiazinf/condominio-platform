'use client'

import type { TUseCreateCondominiumWizard } from '../hooks/useCreateCondominiumWizard'

import { Controller } from 'react-hook-form'
import { Info, Wand2 } from 'lucide-react'
import { Button } from '@heroui/button'

import { useTranslation } from '@/contexts'
import { InputField } from '@/ui/components/input'
import { PhoneInputField } from '@/ui/components/phone-input'
import { LocationSelector } from '@/ui/components/location-selector'
import { Typography } from '@/ui/components/typography'
import { Tooltip } from '@/ui/components/tooltip'
import { ManagementCompanyMultiSelect } from '@/ui/components/management-company-autocomplete'

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

interface CondominiumInfoStepProps {
  wizard: TUseCreateCondominiumWizard
  adminCompanyName?: string
}

export function CondominiumInfoStep({ wizard, adminCompanyName }: CondominiumInfoStepProps) {
  const { t } = useTranslation()
  const { form, translateError, handleGenerateCode, isGeneratingCode, isAdminMode } = wizard
  const {
    control,
    formState: { errors },
  } = form

  return (
    <div className="space-y-10">
      {/* Basic Information Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.condominiums.form.basicSection.title')}
          tooltip={t('superadmin.condominiums.form.basicSection.description')}
        />

        <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
          <InputField
            isRequired
            errorMessage={translateError(errors?.name?.message)}
            label={t('superadmin.condominiums.form.fields.name')}
            name="name"
            placeholder={t('superadmin.condominiums.form.fields.namePlaceholder')}
            tooltip={t('superadmin.condominiums.form.fields.nameDescription')}
            translateError={translateError}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <InputField
                isRequired
                errorMessage={translateError(errors?.code?.message)}
                label={t('superadmin.condominiums.form.fields.code')}
                name="code"
                placeholder={t('superadmin.condominiums.form.fields.codePlaceholder')}
                tooltip={t('superadmin.condominiums.form.fields.codeDescription')}
                translateError={translateError}
              />
            </div>
            <div className="pt-[26px]">
              <Tooltip
                content={t('superadmin.condominiums.form.fields.generateCode')}
                placement="top"
              >
                <Button
                  isIconOnly
                  color="primary"
                  isLoading={isGeneratingCode}
                  size="sm"
                  type="button"
                  variant="flat"
                  onPress={handleGenerateCode}
                >
                  <Wand2 size={14} />
                </Button>
              </Tooltip>
            </div>
          </div>

          {isAdminMode ? (
            <div className="flex flex-col gap-1.5">
              <Typography className="font-medium" variant="body2">
                {t('superadmin.condominiums.form.fields.managementCompanies')}
              </Typography>
              <div className="flex items-center h-10 px-3 rounded-medium bg-default-100 text-default-700 text-sm">
                {adminCompanyName}
              </div>
            </div>
          ) : (
            <Controller
              control={control}
              name="managementCompanyIds"
              render={({ field }) => (
                <ManagementCompanyMultiSelect
                  isRequired
                  errorMessage={translateError(errors?.managementCompanyIds?.message)}
                  label={t('superadmin.condominiums.form.fields.managementCompanies')}
                  placeholder={t(
                    'superadmin.condominiums.form.fields.managementCompanyPlaceholder'
                  )}
                  tooltip={t('superadmin.condominiums.form.fields.managementCompaniesDescription')}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.condominiums.form.contactSection.title')}
          tooltip={t('superadmin.condominiums.form.contactSection.description')}
        />

        <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
          <InputField
            isRequired
            errorMessage={translateError(errors?.email?.message)}
            label={t('superadmin.condominiums.form.fields.email')}
            name="email"
            placeholder={t('superadmin.condominiums.form.fields.emailPlaceholder')}
            tooltip={t('superadmin.condominiums.form.fields.emailDescription')}
            translateError={translateError}
            type="email"
          />

          <PhoneInputField
            isRequired
            countryCodeFieldName="phoneCountryCode"
            label={t('superadmin.condominiums.form.fields.phone')}
            phoneNumberFieldName="phone"
            tooltip={t('superadmin.condominiums.form.fields.phoneDescription')}
            translateError={translateError}
          />
        </div>
      </div>

      {/* Location Section */}
      <div className="space-y-6">
        <SectionHeader
          title={t('superadmin.condominiums.form.locationSection.title')}
          tooltip={t('superadmin.condominiums.form.locationSection.description')}
        />

        <div className="flex flex-col gap-8">
          <Controller
            control={control}
            name="locationId"
            render={({ field }) => (
              <LocationSelector
                isRequired
                cityLabel={t('common.city')}
                cityPlaceholder={t('common.cityPlaceholder')}
                countryLabel={t('common.country')}
                countryPlaceholder={t('common.countryPlaceholder')}
                errorMessage={translateError(errors?.locationId?.message)}
                label={t('superadmin.condominiums.form.fields.location')}
                provinceLabel={t('common.province')}
                provincePlaceholder={t('common.provincePlaceholder')}
                tooltip={t('superadmin.condominiums.form.fields.locationDescription')}
                value={field.value}
                onChange={locationId => field.onChange(locationId)}
              />
            )}
          />

          <InputField
            isRequired
            errorMessage={translateError(errors?.address?.message)}
            label={t('superadmin.condominiums.form.fields.address')}
            name="address"
            placeholder={t('superadmin.condominiums.form.fields.addressPlaceholder')}
            tooltip={t('superadmin.condominiums.form.fields.addressDescription')}
            translateError={translateError}
          />
        </div>
      </div>
    </div>
  )
}
