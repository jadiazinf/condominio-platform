'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/ui/components/input'
import { Switch } from '@/ui/components/switch'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { Plus, X } from 'lucide-react'
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
  defaultFeatureKeys: string[]
}

export function LimitsStepForm({
  shouldShowError,
  translateError,
  defaultFeatureKeys,
}: LimitsStepFormProps) {
  const { t } = useTranslation()
  const { control, watch, setValue } = useFormContext<ISubscriptionFormData>()
  const customFeatures = watch('customFeatures')
  const [newFeatureKey, setNewFeatureKey] = useState('')

  const featureLabels: Record<string, string> = {
    reportes_avanzados: t('superadmin.companies.subscription.form.features.reportes_avanzados'),
    notificaciones_push: t('superadmin.companies.subscription.form.features.notificaciones_push'),
    soporte_prioritario: t('superadmin.companies.subscription.form.features.soporte_prioritario'),
    api_access: t('superadmin.companies.subscription.form.features.api_access'),
    backup_automatico: t('superadmin.companies.subscription.form.features.backup_automatico'),
    multi_moneda: t('superadmin.companies.subscription.form.features.multi_moneda'),
    integracion_bancaria: t('superadmin.companies.subscription.form.features.integracion_bancaria'),
    facturacion_electronica: t('superadmin.companies.subscription.form.features.facturacion_electronica'),
  }

  const handleFeatureToggle = useCallback(
    (key: string, value: boolean) => {
      setValue('customFeatures', { ...customFeatures, [key]: value })
    },
    [customFeatures, setValue]
  )

  const handleAddCustomFeature = useCallback(() => {
    if (newFeatureKey.trim()) {
      const key = newFeatureKey.trim().toLowerCase().replace(/\s+/g, '_')
      setValue('customFeatures', { ...customFeatures, [key]: true })
      setNewFeatureKey('')
    }
  }, [newFeatureKey, customFeatures, setValue])

  const handleRemoveFeature = useCallback(
    (key: string) => {
      const newFeatures = { ...customFeatures }
      delete newFeatures[key]
      setValue('customFeatures', newFeatures)
    },
    [customFeatures, setValue]
  )

  const allFeaturesSelected = Object.values(customFeatures).every((v) => v)

  const handleSelectAll = useCallback(
    (selectAll: boolean) => {
      const updatedFeatures = { ...customFeatures }
      Object.keys(updatedFeatures).forEach((key) => {
        updatedFeatures[key] = selectAll
      })
      setValue('customFeatures', updatedFeatures)
    },
    [customFeatures, setValue]
  )

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
              min: {
                value: 1,
                message: t('superadmin.companies.subscription.form.validation.maxCondominiums.min'),
              },
              pattern: {
                value: /^[1-9]\d*$/,
                message: t('superadmin.companies.subscription.form.validation.integer'),
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
              min: {
                value: 1,
                message: t('superadmin.companies.subscription.form.validation.maxUnits.min'),
              },
              pattern: {
                value: /^[1-9]\d*$/,
                message: t('superadmin.companies.subscription.form.validation.integer'),
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
              min: {
                value: 1,
                message: t('superadmin.companies.subscription.form.validation.maxUsers.min'),
              },
              pattern: {
                value: /^[1-9]\d*$/,
                message: t('superadmin.companies.subscription.form.validation.integer'),
              },
            }}
            render={({ field }) => (
              <Input
                label={t('superadmin.companies.subscription.form.fields.maxUsers')}
                type="text"
                inputMode="numeric"
                placeholder={t('superadmin.companies.subscription.form.fields.maxUsersPlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
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
              min: {
                value: 1,
                message: t('superadmin.companies.subscription.form.validation.maxStorageGb.min'),
              },
              pattern: {
                value: /^[1-9]\d*$/,
                message: t('superadmin.companies.subscription.form.validation.integer'),
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

      {/* Features Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="subtitle2">
              {t('superadmin.companies.subscription.form.sections.features')}
            </Typography>
            <Typography variant="caption" color="muted">
              {t('superadmin.companies.subscription.form.sections.featuresDescription')}
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              isSelected={allFeaturesSelected}
              onValueChange={handleSelectAll}
              size="sm"
              color="primary"
            />
            <Typography variant="body2" color="muted">
              {t('superadmin.companies.subscription.form.fields.selectAll')}
            </Typography>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(customFeatures).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-default-200 p-3"
            >
              <div className="flex items-center gap-3">
                <Switch
                  isSelected={value}
                  onValueChange={(val) => handleFeatureToggle(key, val)}
                  size="sm"
                />
                <span className="text-sm">
                  {featureLabels[key] ||
                    key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>
              {!defaultFeatureKeys.includes(key) && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => handleRemoveFeature(key)}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t('superadmin.companies.subscription.form.fields.newFeature')}
            value={newFeatureKey}
            onValueChange={setNewFeatureKey}
            className="flex-1"
          />
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus size={16} />}
            onPress={handleAddCustomFeature}
            isDisabled={!newFeatureKey.trim()}
          >
            {t('superadmin.companies.subscription.form.fields.addFeature')}
          </Button>
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
