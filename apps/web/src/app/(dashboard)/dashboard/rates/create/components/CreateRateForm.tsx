'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useCreateSubscriptionRate } from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Input, CurrencyInput } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

const createRateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string(),
  condominiumRate: z.string().min(1),
  unitRate: z.string().min(1),
  userRate: z.string(),
  annualDiscountPercentage: z.string(),
  taxRate: z.string(),
  version: z.string().min(1).max(50),
  effectiveFrom: z.string().min(1),
  effectiveUntil: z.string(),
  isActive: z.boolean(),
})

interface CreateRateFormProps {
  onSuccess?: (rateId: string) => void
  onCancel?: () => void
  isEmbedded?: boolean
}

export function CreateRateForm({ onSuccess, onCancel, isEmbedded }: CreateRateFormProps = {}) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createRateSchema),
    defaultValues: {
      name: '',
      description: '',
      condominiumRate: '',
      unitRate: '',
      userRate: '0',
      annualDiscountPercentage: '15',
      taxRate: '',
      version: '',
      effectiveFrom: '',
      effectiveUntil: '',
      isActive: false,
    },
  })

  const createMutation = useCreateSubscriptionRate({
    onSuccess: data => {
      toast.success(t('superadmin.rates.form.success'))
      if (onSuccess) {
        onSuccess(data.data.data.id)
      } else {
        router.push('/dashboard/rates')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('superadmin.rates.form.error'))
    },
  })

  const onSubmit = (data: z.infer<typeof createRateSchema>) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      condominiumRate: parseFloat(data.condominiumRate) || 0,
      unitRate: parseFloat(data.unitRate) || 0,
      userRate: parseFloat(data.userRate || '0'),
      annualDiscountPercentage: parseFloat(data.annualDiscountPercentage || '0'),
      taxRate: data.taxRate ? parseFloat(data.taxRate) / 100 : null,
      version: data.version,
      isActive: data.isActive ?? false,
      effectiveFrom: new Date(data.effectiveFrom).toISOString(),
    }

    if (data.description) {
      payload.description = data.description
    }

    if (data.effectiveUntil) {
      payload.effectiveUntil = new Date(data.effectiveUntil).toISOString()
    }

    createMutation.mutate(payload as any)
  }

  const formContent = (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
      {/* Basic Information */}
      <div className="space-y-4 flex flex-col gap-2">
        <Typography className="text-default-700" variant="h4">
          {t('superadmin.rates.form.fields.name.label')}
        </Typography>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                {...field}
                isRequired
                errorMessage={errors.name ? t('superadmin.rates.form.validation.name') : undefined}
                label={t('superadmin.rates.form.fields.name.label')}
                placeholder={t('superadmin.rates.form.fields.name.placeholder')}
              />
            )}
          />

          <Controller
            control={control}
            name="version"
            render={({ field }) => (
              <Input
                {...field}
                isRequired
                errorMessage={
                  errors.version ? t('superadmin.rates.form.validation.version') : undefined
                }
                label={t('superadmin.rates.form.fields.version.label')}
                placeholder={t('superadmin.rates.form.fields.version.placeholder')}
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              {...field}
              label={t('superadmin.rates.form.fields.description.label')}
              placeholder={t('superadmin.rates.form.fields.description.placeholder')}
              value={field.value || ''}
            />
          )}
        />
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <Typography className="text-default-700" variant="h4">
          Tarifas
        </Typography>

        {/* Monetary rates — 3 columns */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Controller
            control={control}
            name="condominiumRate"
            render={({ field }) => (
              <CurrencyInput
                isRequired
                errorMessage={
                  errors.condominiumRate
                    ? t('superadmin.rates.form.validation.condominiumRate')
                    : undefined
                }
                isInvalid={!!errors.condominiumRate}
                label={t('superadmin.rates.form.fields.condominiumRate.label')}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="unitRate"
            render={({ field }) => (
              <CurrencyInput
                isRequired
                errorMessage={
                  errors.unitRate ? t('superadmin.rates.form.validation.unitRate') : undefined
                }
                isInvalid={!!errors.unitRate}
                label={t('superadmin.rates.form.fields.unitRate.label')}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="userRate"
            render={({ field }) => (
              <CurrencyInput
                label={t('superadmin.rates.form.fields.userRate.label')}
                value={field.value || '0'}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Percentage fields — 2 columns */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="annualDiscountPercentage"
            render={({ field }) => (
              <Input
                endContent={<span className="text-default-400 text-sm">%</span>}
                label={t('superadmin.rates.form.fields.annualDiscountPercentage.label')}
                placeholder={t('superadmin.rates.form.fields.annualDiscountPercentage.placeholder')}
                type="number"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="taxRate"
            render={({ field }) => (
              <Input
                description="Deja vacío si esta tarifa no incluye IVA"
                endContent={<span className="text-default-400 text-sm">%</span>}
                label="Tasa de IVA"
                placeholder="Ej: 16"
                type="number"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <Typography className="text-default-700" variant="h4">
          {t('superadmin.rates.form.fields.effectiveFrom.label')}
        </Typography>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Controller
            control={control}
            name="effectiveFrom"
            render={({ field }) => (
              <Input
                {...field}
                isRequired
                errorMessage={
                  errors.effectiveFrom
                    ? t('superadmin.rates.form.validation.effectiveFrom')
                    : undefined
                }
                label={t('superadmin.rates.form.fields.effectiveFrom.label')}
                placeholder={t('superadmin.rates.form.fields.effectiveFrom.placeholder')}
                type="date"
              />
            )}
          />

          <Controller
            control={control}
            name="effectiveUntil"
            render={({ field }) => (
              <Input
                {...field}
                label={t('superadmin.rates.form.fields.effectiveUntil.label')}
                placeholder={t('superadmin.rates.form.fields.effectiveUntil.placeholder')}
                type="date"
                value={field.value || ''}
              />
            )}
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch color="success" isSelected={field.value} onValueChange={field.onChange} />
          )}
        />
        <Typography variant="body2">{t('superadmin.rates.form.fields.isActive.label')}</Typography>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          isDisabled={isSubmitting || createMutation.isPending}
          variant="flat"
          onPress={() => (onCancel ? onCancel() : router.push('/dashboard/rates'))}
        >
          {t('common.cancel')}
        </Button>
        <Button
          className="text-white"
          color="success"
          isLoading={isSubmitting || createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending
            ? t('superadmin.rates.form.submitting')
            : t('superadmin.rates.form.submit')}
        </Button>
      </div>
    </form>
  )

  if (isEmbedded) return formContent

  return (
    <Card>
      <CardBody>{formContent}</CardBody>
    </Card>
  )
}
