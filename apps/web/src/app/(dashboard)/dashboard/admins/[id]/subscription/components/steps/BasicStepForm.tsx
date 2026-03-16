'use client'

import type { ISubscriptionFormData } from '../../hooks'

import { useEffect, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { HelpCircle } from 'lucide-react'

import { Input } from '@/ui/components/input'
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
      const start = new Date(startDate)
      const end = new Date(start)

      switch (billingCycle) {
        case 'monthly':
          end.setMonth(end.getMonth() + 1)
          break
        case 'quarterly':
          end.setMonth(end.getMonth() + 3)
          break
        case 'semi_annual':
          end.setMonth(end.getMonth() + 6)
          break
        case 'annual':
          end.setFullYear(end.getFullYear() + 1)
          break
        case 'custom':
          end.setMonth(end.getMonth() + 1)
          break
        default:
          return
      }

      setValue('endDate', end.toISOString().split('T')[0])
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

  const dateInputClass =
    'w-full rounded-md border border-default-200 bg-default-100 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  const dateInputDisabledClass =
    'w-full rounded-md border border-default-200 bg-default-50 px-3 py-2 text-sm text-default-500 cursor-not-allowed'

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
              <div className="space-y-3">
                <label className="flex items-center gap-1 text-sm font-medium" htmlFor="startDate">
                  <span className="text-danger">* </span>
                  {t('superadmin.companies.subscription.form.fields.startDate')}
                  <Tooltip
                    content={t(
                      'superadmin.companies.subscription.form.fields.startDateDescription'
                    )}
                  >
                    <HelpCircle className="text-default-400 cursor-help" size={14} />
                  </Tooltip>
                </label>
                <input
                  required
                  aria-label={t('superadmin.companies.subscription.form.fields.startDate')}
                  className={`${dateInputClass} ${shouldShowError('startDate') ? 'border-danger' : ''}`}
                  id="startDate"
                  type="date"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={e => field.onChange(e.target.value)}
                />
                {shouldShowError('startDate') && (
                  <p className="text-xs text-danger">{translateError('startDate')}</p>
                )}
              </div>
            )}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.startDate.required'),
            }}
          />

          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <div className="space-y-3">
                <label className="flex items-center gap-1 text-sm font-medium" htmlFor="endDate">
                  <span className="text-danger">* </span>
                  {t('superadmin.companies.subscription.form.fields.endDate')}
                  <Tooltip
                    content={t(
                      'superadmin.companies.subscription.form.fields.endDateCalculatedDescription'
                    )}
                  >
                    <HelpCircle className="text-default-400 cursor-help" size={14} />
                  </Tooltip>
                </label>
                <input
                  disabled
                  readOnly
                  aria-label={t('superadmin.companies.subscription.form.fields.endDate')}
                  className={dateInputDisabledClass}
                  id="endDate"
                  type="date"
                  value={field.value}
                />
                <p className="text-xs text-default-400">
                  {t('superadmin.companies.subscription.form.fields.endDateAutoCalculated')}
                </p>
              </div>
            )}
          />

          {status === 'trial' && (
            <Controller
              control={control}
              name="trialEndsAt"
              render={({ field }) => (
                <div className="space-y-3">
                  <label
                    className="flex items-center gap-1 text-sm font-medium"
                    htmlFor="trialEndsAt"
                  >
                    <span className="text-danger">* </span>
                    {t('superadmin.companies.subscription.form.fields.trialEndsAt')}
                    <Tooltip
                      content={t(
                        'superadmin.companies.subscription.form.fields.trialEndsAtDescription'
                      )}
                    >
                      <HelpCircle className="text-default-400 cursor-help" size={14} />
                    </Tooltip>
                  </label>
                  <input
                    required
                    aria-label={t('superadmin.companies.subscription.form.fields.trialEndsAt')}
                    className={`${dateInputClass} ${shouldShowError('trialEndsAt') ? 'border-danger' : ''}`}
                    id="trialEndsAt"
                    type="date"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={e => field.onChange(e.target.value)}
                  />
                  {shouldShowError('trialEndsAt') && (
                    <p className="text-xs text-danger">{translateError('trialEndsAt')}</p>
                  )}
                </div>
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
