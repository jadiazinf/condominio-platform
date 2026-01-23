'use client'

import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import type { TCreateManagementCompanyWithAdminForm, TCompanyStep } from '@packages/domain'
import { Tooltip } from '@heroui/tooltip'
import { Info } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'

interface CompanyStepFormProps {
  control: Control<TCreateManagementCompanyWithAdminForm, any, any>
  errors: FieldErrors<TCompanyStep> | undefined
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

export function CompanyStepForm({ control, errors, translateError }: CompanyStepFormProps) {
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
                errorMessage={translateError(errors?.name?.message)}
                isInvalid={!!errors?.name}
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
                tooltip={t('superadmin.companies.form.fields.legalNameDescription')}
                errorMessage={translateError(errors?.legalName?.message)}
                isInvalid={!!errors?.legalName}
                label={t('superadmin.companies.form.fields.legalName')}
                placeholder={t('superadmin.companies.form.fields.legalNamePlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="company.taxId"
            render={({ field }) => (
              <Input
                tooltip={t('superadmin.companies.form.fields.taxIdDescription')}
                errorMessage={translateError(errors?.taxId?.message)}
                isInvalid={!!errors?.taxId}
                label={t('superadmin.companies.form.fields.taxId')}
                placeholder={t('superadmin.companies.form.fields.taxIdPlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
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
                tooltip={t('superadmin.companies.form.fields.emailDescription')}
                errorMessage={translateError(errors?.email?.message)}
                isInvalid={!!errors?.email}
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
            name="company.phone"
            render={({ field }) => (
              <Input
                tooltip={t('superadmin.companies.form.fields.phoneDescription')}
                errorMessage={translateError(errors?.phone?.message)}
                isInvalid={!!errors?.phone}
                label={t('superadmin.companies.form.fields.phone')}
                placeholder={t('superadmin.companies.form.fields.phonePlaceholder')}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="company.website"
            render={({ field }) => (
              <Input
                tooltip={t('superadmin.companies.form.fields.websiteDescription')}
                errorMessage={translateError(errors?.website?.message)}
                isInvalid={!!errors?.website}
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
            name="company.address"
            render={({ field }) => (
              <Input
                tooltip={t('superadmin.companies.form.fields.addressDescription')}
                errorMessage={translateError(errors?.address?.message)}
                isInvalid={!!errors?.address}
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
