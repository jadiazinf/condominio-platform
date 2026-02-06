'use client'

import { type KeyboardEvent } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { useTranslation } from '@/contexts'
import type { ISubscriptionFormData } from '../../hooks'

// Only allow positive integer keys
const handleIntegerKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  // Allow: backspace, delete, tab, escape, enter, arrows
  if (
    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
  ) {
    return
  }
  // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
    return
  }
  // Block non-numeric keys
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault()
  }
}

// Filter pasted content to only allow digits
const handleIntegerPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  const pastedData = e.clipboardData.getData('text')
  if (!/^\d+$/.test(pastedData)) {
    e.preventDefault()
  }
}

interface LimitsStepFormProps {
  shouldShowError: (field: keyof ISubscriptionFormData) => boolean
  translateError: (field: keyof ISubscriptionFormData) => string | undefined
}

export function LimitsStepForm({
  shouldShowError,
  translateError,
}: LimitsStepFormProps) {
  const { t } = useTranslation()
  const { control } = useFormContext<ISubscriptionFormData>()

  return (
    <div className="space-y-8 pb-8">
      {/* Limits Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.limits')}
          </Typography>
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.limitsDescription')}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Controller
            name="maxCondominiums"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.maxCondominiums.required'),
              validate: (value) => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)
                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxCondominiums.min')
                }
                return true
              },
            }}
            render={({ field }) => (
              <Input
                label={t('superadmin.companies.subscription.form.fields.maxCondominiums')}
                type="text"
                inputMode="numeric"
                placeholder={t('superadmin.companies.subscription.form.fields.maxCondominiumsPlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={(e) => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                isRequired
                isInvalid={shouldShowError('maxCondominiums')}
                errorMessage={translateError('maxCondominiums')}
              />
            )}
          />

          <Controller
            name="maxUnits"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.maxUnits.required'),
              validate: (value) => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)
                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxUnits.min')
                }
                return true
              },
            }}
            render={({ field }) => (
              <Input
                label={t('superadmin.companies.subscription.form.fields.maxUnits')}
                type="text"
                inputMode="numeric"
                placeholder={t('superadmin.companies.subscription.form.fields.maxUnitsPlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={(e) => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                isRequired
                isInvalid={shouldShowError('maxUnits')}
                errorMessage={translateError('maxUnits')}
              />
            )}
          />

          <Controller
            name="maxUsers"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.maxUsers.required'),
              validate: (value) => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)
                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxUsers.min')
                }
                return true
              },
            }}
            render={({ field }) => (
              <Input
                label={t('superadmin.companies.subscription.form.fields.maxUsers')}
                tooltip={t('superadmin.companies.subscription.form.fields.maxUsersDescription')}
                type="text"
                inputMode="numeric"
                placeholder={t('superadmin.companies.subscription.form.fields.maxUsersPlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={(e) => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                isRequired
                isInvalid={shouldShowError('maxUsers')}
                errorMessage={translateError('maxUsers')}
              />
            )}
          />

          <Controller
            name="maxStorageGb"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.maxStorageGb.required'),
              validate: (value) => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)
                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxStorageGb.min')
                }
                return true
              },
            }}
            render={({ field }) => (
              <Input
                label={t('superadmin.companies.subscription.form.fields.maxStorageGb')}
                type="text"
                inputMode="numeric"
                placeholder={t('superadmin.companies.subscription.form.fields.maxStorageGbPlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={(e) => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                isRequired
                isInvalid={shouldShowError('maxStorageGb')}
                errorMessage={translateError('maxStorageGb')}
              />
            )}
          />
        </div>
      </div>

      <Divider className="my-12" />

      {/* Notes Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.notes')}
          </Typography>
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.notesDescription')}
          </Typography>
        </div>

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <textarea
              placeholder={t('superadmin.companies.subscription.form.fields.notesPlaceholder')}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              className="w-full min-h-[100px] rounded-md border border-default-200 bg-default-100 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={4}
            />
          )}
        />
      </div>
    </div>
  )
}
