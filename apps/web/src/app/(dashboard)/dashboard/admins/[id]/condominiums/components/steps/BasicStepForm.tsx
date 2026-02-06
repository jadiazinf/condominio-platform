'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslation } from '@/contexts'
import type { ICondominiumFormData } from '../../hooks/useCondominiumForm'
import { Switch, Input, Label } from '@/ui/components'

export function BasicStepForm() {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext<ICondominiumFormData>()

  const isActive = watch('isActive')

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" required>
          {t('condominiums.form.fields.name.label')}
        </Label>
        <Input
          id="name"
          {...register('name', {
            required: t('condominiums.form.fields.name.error'),
            maxLength: {
              value: 255,
              message: t('condominiums.form.fields.name.error'),
            },
          })}
          placeholder={t('condominiums.form.fields.name.placeholder')}
          error={errors.name?.message}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">{t('condominiums.form.fields.code.label')}</Label>
        <Input
          id="code"
          {...register('code', {
            maxLength: {
              value: 50,
              message: t('condominiums.form.fields.code.maxLengthError'),
            },
          })}
          placeholder={t('condominiums.form.fields.code.placeholder')}
          error={errors.code?.message}
        />
        <p className="text-sm text-gray-500">{t('condominiums.form.fields.code.placeholder')}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">{t('condominiums.form.fields.status.label')}</Label>
          <p className="text-sm text-gray-500">
            {isActive
              ? t('condominiums.form.fields.status.active')
              : t('condominiums.form.fields.status.inactive')}
          </p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked: boolean) => setValue('isActive', checked)}
        />
      </div>
    </div>
  )
}
