'use client'

import { useEffect } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Switch } from '@/ui/components/switch'
import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { Tooltip } from '@/ui/components/tooltip'
import { HelpCircle } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { ISubscriptionFormData } from '../../hooks'

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

  // Auto-calculate end date based on billing cycle
  useEffect(() => {
    if (startDate && billingCycle) {
      const start = new Date(startDate)
      let end: Date

      if (billingCycle === 'monthly') {
        end = new Date(start)
        end.setMonth(end.getMonth() + 1)
      } else if (billingCycle === 'annual') {
        end = new Date(start)
        end.setFullYear(end.getFullYear() + 1)
      } else {
        return
      }

      setValue('endDate', end.toISOString().split('T')[0])
    }
  }, [startDate, billingCycle, setValue])

  const billingCycleItems: ISelectItem[] = [
    { key: 'monthly', label: t('superadmin.companies.subscription.form.billingCycles.monthly') },
    { key: 'annual', label: t('superadmin.companies.subscription.form.billingCycles.annual') },
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
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.basicInfoDescription')}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            name="subscriptionName"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.subscriptionName.required'),
            }}
            render={({ field }) => (
              <Input
                label={t('superadmin.companies.subscription.form.fields.subscriptionName')}
                tooltip={t('superadmin.companies.subscription.form.fields.subscriptionNameDescription')}
                placeholder={t('superadmin.companies.subscription.form.fields.subscriptionNamePlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
                isRequired
                isInvalid={shouldShowError('subscriptionName')}
                errorMessage={translateError('subscriptionName')}
              />
            )}
          />

          <Controller
            name="billingCycle"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.billingCycle.required'),
            }}
            render={({ field }) => (
              <Select
                aria-label={t('superadmin.companies.subscription.form.fields.billingCycle')}
                label={
                  <span className="flex items-center gap-1">
                    {t('superadmin.companies.subscription.form.fields.billingCycle')}
                    <Tooltip content={t('superadmin.companies.subscription.form.fields.billingCycleDescription')}>
                      <HelpCircle size={14} className="text-default-400 cursor-help" />
                    </Tooltip>
                  </span>
                }
                items={billingCycleItems}
                value={field.value}
                onChange={(key) => key && field.onChange(key)}
                isRequired
                isInvalid={shouldShowError('billingCycle')}
                errorMessage={translateError('billingCycle')}
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.status.required'),
            }}
            render={({ field }) => (
              <Select
                aria-label={t('superadmin.companies.subscription.form.fields.status')}
                label={
                  <span className="flex items-center gap-1">
                    {t('superadmin.companies.subscription.form.fields.status')}
                    <Tooltip content={t('superadmin.companies.subscription.form.fields.statusDescription')}>
                      <HelpCircle size={14} className="text-default-400 cursor-help" />
                    </Tooltip>
                  </span>
                }
                items={statusItems}
                value={field.value}
                onChange={(key) => key && field.onChange(key)}
                isRequired
                isInvalid={shouldShowError('status')}
                errorMessage={translateError('status')}
              />
            )}
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
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.datesDescription')}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            name="startDate"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.startDate.required'),
            }}
            render={({ field }) => (
              <div className="space-y-3">
                <label className="flex items-center gap-1 text-sm font-medium">
                  <span className="text-danger">* </span>
                  {t('superadmin.companies.subscription.form.fields.startDate')}
                  <Tooltip content={t('superadmin.companies.subscription.form.fields.startDateDescription')}>
                    <HelpCircle size={14} className="text-default-400 cursor-help" />
                  </Tooltip>
                </label>
                <input
                  type="date"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  className={`${dateInputClass} ${shouldShowError('startDate') ? 'border-danger' : ''}`}
                  required
                />
                {shouldShowError('startDate') && (
                  <p className="text-xs text-danger">{translateError('startDate')}</p>
                )}
              </div>
            )}
          />

          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                <label className="flex items-center gap-1 text-sm font-medium">
                  <span className="text-danger">* </span>
                  {t('superadmin.companies.subscription.form.fields.endDate')}
                  <Tooltip content={t('superadmin.companies.subscription.form.fields.endDateCalculatedDescription')}>
                    <HelpCircle size={14} className="text-default-400 cursor-help" />
                  </Tooltip>
                </label>
                <input
                  type="date"
                  value={field.value}
                  className={dateInputDisabledClass}
                  disabled
                  readOnly
                />
                <p className="text-xs text-default-400">
                  {t('superadmin.companies.subscription.form.fields.endDateAutoCalculated')}
                </p>
              </div>
            )}
          />

          {status === 'trial' && (
            <Controller
              name="trialEndsAt"
              control={control}
              rules={{
                required:
                  status === 'trial'
                    ? t('superadmin.companies.subscription.form.validation.trialEndsAt.required')
                    : false,
              }}
              render={({ field }) => (
                <div className="space-y-3">
                  <label className="flex items-center gap-1 text-sm font-medium">
                    <span className="text-danger">* </span>
                    {t('superadmin.companies.subscription.form.fields.trialEndsAt')}
                    <Tooltip content={t('superadmin.companies.subscription.form.fields.trialEndsAtDescription')}>
                      <HelpCircle size={14} className="text-default-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="date"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    className={`${dateInputClass} ${shouldShowError('trialEndsAt') ? 'border-danger' : ''}`}
                    required
                  />
                  {shouldShowError('trialEndsAt') && (
                    <p className="text-xs text-danger">{translateError('trialEndsAt')}</p>
                  )}
                </div>
              )}
            />
          )}
        </div>

        <Controller
          name="autoRenew"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3 pt-2">
              <Switch
                isSelected={field.value}
                onValueChange={field.onChange}
                color="success"
              >
                {t('superadmin.companies.subscription.form.fields.autoRenew')}
              </Switch>
              <Tooltip content={t('superadmin.companies.subscription.form.fields.autoRenewDescription')}>
                <HelpCircle size={14} className="text-default-400 cursor-help" />
              </Tooltip>
            </div>
          )}
        />
      </div>
    </div>
  )
}
