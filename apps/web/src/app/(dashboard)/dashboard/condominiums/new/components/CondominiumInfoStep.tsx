'use client'

import { useCallback } from 'react'
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
import type { TUseCreateCondominiumWizard } from '../hooks/useCreateCondominiumWizard'

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
            name="name"
            isRequired
            tooltip={t('superadmin.condominiums.form.fields.nameDescription')}
            label={t('superadmin.condominiums.form.fields.name')}
            placeholder={t('superadmin.condominiums.form.fields.namePlaceholder')}
            translateError={translateError}
            errorMessage={translateError(errors?.name?.message)}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <InputField
                name="code"
                isRequired
                tooltip={t('superadmin.condominiums.form.fields.codeDescription')}
                label={t('superadmin.condominiums.form.fields.code')}
                placeholder={t('superadmin.condominiums.form.fields.codePlaceholder')}
                translateError={translateError}
                errorMessage={translateError(errors?.code?.message)}
              />
            </div>
            <div className="pt-[26px]">
              <Tooltip
                content={t('superadmin.condominiums.form.fields.generateCode')}
                placement="top"
              >
                <Button
                  type="button"
                  variant="flat"
                  color="primary"
                  size="sm"
                  isIconOnly
                  isLoading={isGeneratingCode}
                  onPress={handleGenerateCode}
                >
                  <Wand2 size={14} />
                </Button>
              </Tooltip>
            </div>
          </div>

          {isAdminMode ? (
            <div className="flex flex-col gap-1.5">
              <Typography variant="body2" className="font-medium">
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
                  value={field.value}
                  onChange={field.onChange}
                  isRequired
                  errorMessage={translateError(errors?.managementCompanyIds?.message)}
                  label={t('superadmin.condominiums.form.fields.managementCompanies')}
                  tooltip={t('superadmin.condominiums.form.fields.managementCompaniesDescription')}
                  placeholder={t(
                    'superadmin.condominiums.form.fields.managementCompanyPlaceholder'
                  )}
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
            name="email"
            type="email"
            isRequired
            tooltip={t('superadmin.condominiums.form.fields.emailDescription')}
            label={t('superadmin.condominiums.form.fields.email')}
            placeholder={t('superadmin.condominiums.form.fields.emailPlaceholder')}
            translateError={translateError}
            errorMessage={translateError(errors?.email?.message)}
          />

          <PhoneInputField
            countryCodeFieldName="phoneCountryCode"
            phoneNumberFieldName="phone"
            isRequired
            label={t('superadmin.condominiums.form.fields.phone')}
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
                value={field.value}
                onChange={(locationId) => field.onChange(locationId)}
                isRequired
                errorMessage={translateError(errors?.locationId?.message)}
                label={t('superadmin.condominiums.form.fields.location')}
                tooltip={t('superadmin.condominiums.form.fields.locationDescription')}
                countryLabel={t('common.country')}
                countryPlaceholder={t('common.countryPlaceholder')}
                provinceLabel={t('common.province')}
                provincePlaceholder={t('common.provincePlaceholder')}
                cityLabel={t('common.city')}
                cityPlaceholder={t('common.cityPlaceholder')}
              />
            )}
          />

          <InputField
            name="address"
            isRequired
            tooltip={t('superadmin.condominiums.form.fields.addressDescription')}
            label={t('superadmin.condominiums.form.fields.address')}
            placeholder={t('superadmin.condominiums.form.fields.addressPlaceholder')}
            translateError={translateError}
            errorMessage={translateError(errors?.address?.message)}
          />
        </div>
      </div>
    </div>
  )
}
