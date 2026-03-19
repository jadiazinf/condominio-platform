'use client'

import type { ISubscriptionFormData } from '../../hooks'

import { useEffect, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { HelpCircle } from 'lucide-react'

import { Input } from '@/ui/components/input'
import { DatePicker } from '@/ui/components/date-picker'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { Tooltip } from '@/ui/components/tooltip'
import { useTranslation } from '@/contexts'

interface BasicStepFormProps {
  shouldShowError: (field: keyof ISubscriptionFormData) => boolean
  translateError: (field: keyof ISubscriptionFormData) => string | undefined
}

export function BasicStepForm({ shouldShowError, translateError }: BasicStepFormProps) {
  const { t } = useTranslation()
  const { control, watch, setValue } = useFormContext<ISubscriptionFormData>()
  const status = watch('status')
  const billingCycle = watch('billingCycle')
  const startDate = watch('startDate')

  // State for custom subscription name
  const [nameOption, setNameOption] = useState<string>('basic')

  // Auto-calculate end date based on billing cycle
  useEffect(() => {
    if (startDate && billingCycle) {
      // Parse YYYY-MM-DD parts directly to avoid timezone issues
      const [yearStr, monthStr, dayStr] = startDate.split('-')
      let year = Number(yearStr)
      let month = Number(monthStr) // 1-based
      const day = Number(dayStr)

      switch (billingCycle) {
        case 'monthly':
          month += 1
          break
        case 'quarterly':
          month += 3
          break
        case 'semi_annual':
          month += 6
          break
        case 'annual':
          year += 1
          break
        case 'custom':
          month += 1
          break
        default:
          return
      }

      // Handle month overflow (e.g. month 13 → next year month 1)
      while (month > 12) {
        month -= 12
        year += 1
      }

      const endDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      setValue('endDate', endDate)
    }
  }, [startDate, billingCycle, setValue])

  const subscriptionNameItems: ISelectItem[] = [
    {
      key: 'basic',
      label: t('superadmin.companies.subscription.form.fields.subscriptionNameOptions.basic'),
    },
    {
      key: 'standard',
      label: t('superadmin.companies.subscription.form.fields.subscriptionNameOptions.standard'),
    },
    {
      key: 'professional',
      label: t(
        'superadmin.companies.subscription.form.fields.subscriptionNameOptions.professional'
      ),
    },
    {
      key: 'enterprise',
      label: t('superadmin.companies.subscription.form.fields.subscriptionNameOptions.enterprise'),
    },
    {
      key: 'custom',
      label: t('superadmin.companies.subscription.form.fields.subscriptionNameOptions.custom'),
    },
  ]

  const billingCycleItems: ISelectItem[] = [
    { key: 'monthly', label: t('superadmin.companies.subscription.form.billingCycles.monthly') },
    {
      key: 'quarterly',
      label: t('superadmin.companies.subscription.form.billingCycles.quarterly'),
    },
    {
      key: 'semi_annual',
      label: t('superadmin.companies.subscription.form.billingCycles.semi_annual'),
    },
    { key: 'annual', label: t('superadmin.companies.subscription.form.billingCycles.annual') },
    { key: 'custom', label: t('superadmin.companies.subscription.form.billingCycles.custom') },
  ]

  const statusItems: ISelectItem[] = [
    { key: 'trial', label: t('superadmin.companies.subscription.form.statuses.trial') },
    { key: 'active', label: t('superadmin.companies.subscription.form.statuses.active') },
    { key: 'inactive', label: t('superadmin.companies.subscription.form.statuses.inactive') },
  ]

  return (
    <div className="space-y-8 pb-8">
      {/* Basic Info Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.basicInfo')}
          </Typography>
          <Typography color="muted" variant="caption">
            {t('superadmin.companies.subscription.form.sections.basicInfoDescription')}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <Select
              isRequired
              aria-label={t('superadmin.companies.subscription.form.fields.subscriptionName')}
              items={subscriptionNameItems}
              label={
                <span className="flex items-center gap-1">
                  {t('superadmin.companies.subscription.form.fields.subscriptionName')}
                  <Tooltip
                    content={t(
                      'superadmin.companies.subscription.form.fields.subscriptionNameDescription'
                    )}
                  >
                    <HelpCircle className="text-default-400 cursor-help" size={14} />
                  </Tooltip>
                </span>
              }
              value={nameOption}
              onChange={key => {
                if (key) {
                  setNameOption(key)
                  // If not custom, set the translated name
                  if (key !== 'custom') {
                    setValue(
                      'subscriptionName',
                      t(
                        `superadmin.companies.subscription.form.fields.subscriptionNameOptions.${key}`
                      )
                    )
                  } else {
                    setValue('subscriptionName', '')
                  }
                }
              }}
            />

            {nameOption === 'custom' && (
              <Controller
                control={control}
                name="subscriptionName"
                render={({ field }) => (
                  <Input
                    isRequired
                    errorMessage={translateError('subscriptionName')}
                    isInvalid={shouldShowError('subscriptionName')}
                    placeholder={t(
                      'superadmin.companies.subscription.form.fields.customSubscriptionNamePlaceholder'
                    )}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
                rules={{
                  required: t(
                    'superadmin.companies.subscription.form.validation.subscriptionName.required'
                  ),
                }}
              />
            )}
          </div>

          <Controller
            control={control}
            name="billingCycle"
            render={({ field }) => (
              <Select
                isRequired
                aria-label={t('superadmin.companies.subscription.form.fields.billingCycle')}
                errorMessage={translateError('billingCycle')}
                isInvalid={shouldShowError('billingCycle')}
                items={billingCycleItems}
                label={
                  <span className="flex items-center gap-1">
                    {t('superadmin.companies.subscription.form.fields.billingCycle')}
                    <Tooltip
                      content={t(
                        'superadmin.companies.subscription.form.fields.billingCycleDescription'
                      )}
                    >
                      <HelpCircle className="text-default-400 cursor-help" size={14} />
                    </Tooltip>
                  </span>
                }
                value={field.value}
                onChange={key => key && field.onChange(key)}
              />
            )}
            rules={{
              required: t(
                'superadmin.companies.subscription.form.validation.billingCycle.required'
              ),
            }}
          />

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                isRequired
                aria-label={t('superadmin.companies.subscription.form.fields.status')}
                errorMessage={translateError('status')}
                isInvalid={shouldShowError('status')}
                items={statusItems}
                label={
                  <span className="flex items-center gap-1">
                    {t('superadmin.companies.subscription.form.fields.status')}
                    <Tooltip
                      content={t('superadmin.companies.subscription.form.fields.statusDescription')}
                    >
                      <HelpCircle className="text-default-400 cursor-help" size={14} />
                    </Tooltip>
                  </span>
                }
                value={field.value}
                onChange={key => key && field.onChange(key)}
              />
            )}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.status.required'),
            }}
          />
        </div>
      </div>

      <Divider className="my-12" />

      {/* Dates Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.dates')}
          </Typography>
          <Typography color="muted" variant="caption">
            {t('superadmin.companies.subscription.form.sections.datesDescription')}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <DatePicker
                isRequired
                errorMessage={
                  shouldShowError('startDate') ? translateError('startDate') : undefined
                }
                label={
                  <span className="flex items-center gap-1">
                    {t('superadmin.companies.subscription.form.fields.startDate')}
                    <Tooltip
                      content={t(
                        'superadmin.companies.subscription.form.fields.startDateDescription'
                      )}
                    >
                      <HelpCircle className="text-default-400 cursor-help" size={14} />
                    </Tooltip>
                  </span>
                }
                value={field.value}
                onChange={field.onChange}
              />
            )}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.startDate.required'),
            }}
          />

          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <DatePicker
                isDisabled
                isReadOnly
                description={t(
                  'superadmin.companies.subscription.form.fields.endDateAutoCalculated'
                )}
                label={
                  <span className="flex items-center gap-1">
                    {t('superadmin.companies.subscription.form.fields.endDate')}
                    <Tooltip
                      content={t(
                        'superadmin.companies.subscription.form.fields.endDateCalculatedDescription'
                      )}
                    >
                      <HelpCircle className="text-default-400 cursor-help" size={14} />
                    </Tooltip>
                  </span>
                }
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {status === 'trial' && (
            <Controller
              control={control}
              name="trialEndsAt"
              render={({ field }) => (
                <DatePicker
                  isRequired
                  errorMessage={
                    shouldShowError('trialEndsAt') ? translateError('trialEndsAt') : undefined
                  }
                  label={
                    <span className="flex items-center gap-1">
                      {t('superadmin.companies.subscription.form.fields.trialEndsAt')}
                      <Tooltip
                        content={t(
                          'superadmin.companies.subscription.form.fields.trialEndsAtDescription'
                        )}
                      >
                        <HelpCircle className="text-default-400 cursor-help" size={14} />
                      </Tooltip>
                    </span>
                  }
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
              rules={{
                required:
                  status === 'trial'
                    ? t('superadmin.companies.subscription.form.validation.trialEndsAt.required')
                    : false,
              }}
            />
          )}
        </div>

        <Controller
          control={control}
          name="autoRenew"
          render={({ field }) => (
            <div className="flex items-center gap-3 pt-2">
              <Switch color="success" isSelected={field.value} onValueChange={field.onChange}>
                {t('superadmin.companies.subscription.form.fields.autoRenew')}
              </Switch>
              <Tooltip
                content={t('superadmin.companies.subscription.form.fields.autoRenewDescription')}
              >
                <HelpCircle className="text-default-400 cursor-help" size={14} />
              </Tooltip>
            </div>
          )}
        />
      </div>
    </div>
  )
}
