'use client'

import type { ISubscriptionFormData } from '../../hooks'

import { type KeyboardEvent } from 'react'
import { useFormContext, Controller } from 'react-hook-form'

import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { useTranslation } from '@/contexts'

// Only allow positive integer keys
const handleIntegerKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  // Allow: backspace, delete, tab, escape, enter, arrows
  if (
    [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
    ].includes(e.key)
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

export function LimitsStepForm({ shouldShowError, translateError }: LimitsStepFormProps) {
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
          <Typography color="muted" variant="caption">
            {t('superadmin.companies.subscription.form.sections.limitsDescription')}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Controller
            control={control}
            name="maxCondominiums"
            render={({ field }) => (
              <Input
                isRequired
                errorMessage={translateError('maxCondominiums')}
                inputMode="numeric"
                isInvalid={shouldShowError('maxCondominiums')}
                label={t('superadmin.companies.subscription.form.fields.maxCondominiums')}
                placeholder={t(
                  'superadmin.companies.subscription.form.fields.maxCondominiumsPlaceholder'
                )}
                type="text"
                value={field.value}
                onBlur={e => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                onValueChange={field.onChange}
              />
            )}
            rules={{
              required: t(
                'superadmin.companies.subscription.form.validation.maxCondominiums.required'
              ),
              validate: value => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)

                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxCondominiums.min')
                }

                return true
              },
            }}
          />

          <Controller
            control={control}
            name="maxUnits"
            render={({ field }) => (
              <Input
                isRequired
                errorMessage={translateError('maxUnits')}
                inputMode="numeric"
                isInvalid={shouldShowError('maxUnits')}
                label={t('superadmin.companies.subscription.form.fields.maxUnits')}
                placeholder={t('superadmin.companies.subscription.form.fields.maxUnitsPlaceholder')}
                type="text"
                value={field.value}
                onBlur={e => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                onValueChange={field.onChange}
              />
            )}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.maxUnits.required'),
              validate: value => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)

                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxUnits.min')
                }

                return true
              },
            }}
          />

          <Controller
            control={control}
            name="maxUsers"
            render={({ field }) => (
              <Input
                isRequired
                errorMessage={translateError('maxUsers')}
                inputMode="numeric"
                isInvalid={shouldShowError('maxUsers')}
                label={t('superadmin.companies.subscription.form.fields.maxUsers')}
                placeholder={t('superadmin.companies.subscription.form.fields.maxUsersPlaceholder')}
                tooltip={t('superadmin.companies.subscription.form.fields.maxUsersDescription')}
                type="text"
                value={field.value}
                onBlur={e => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                onValueChange={field.onChange}
              />
            )}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.maxUsers.required'),
              validate: value => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)

                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxUsers.min')
                }

                return true
              },
            }}
          />

          <Controller
            control={control}
            name="maxStorageGb"
            render={({ field }) => (
              <Input
                isRequired
                errorMessage={translateError('maxStorageGb')}
                inputMode="numeric"
                isInvalid={shouldShowError('maxStorageGb')}
                label={t('superadmin.companies.subscription.form.fields.maxStorageGb')}
                placeholder={t(
                  'superadmin.companies.subscription.form.fields.maxStorageGbPlaceholder'
                )}
                type="text"
                value={field.value}
                onBlur={e => {
                  // Set to '1' if left empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    field.onChange('1')
                  }
                  field.onBlur()
                }}
                onKeyDown={handleIntegerKeyDown}
                onPaste={handleIntegerPaste}
                onValueChange={field.onChange}
              />
            )}
            rules={{
              required: t(
                'superadmin.companies.subscription.form.validation.maxStorageGb.required'
              ),
              validate: value => {
                // Allow empty during editing
                if (value === '') return true
                const numValue = parseInt(value, 10)

                if (isNaN(numValue) || numValue < 1) {
                  return t('superadmin.companies.subscription.form.validation.maxStorageGb.min')
                }

                return true
              },
            }}
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
          <Typography color="muted" variant="caption">
            {t('superadmin.companies.subscription.form.sections.notesDescription')}
          </Typography>
        </div>

        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <textarea
              className="w-full min-h-[100px] rounded-md border border-default-200 bg-default-100 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder={t('superadmin.companies.subscription.form.fields.notesPlaceholder')}
              rows={4}
              value={field.value}
              onBlur={field.onBlur}
              onChange={e => field.onChange(e.target.value)}
            />
          )}
        />
      </div>
    </div>
  )
}
