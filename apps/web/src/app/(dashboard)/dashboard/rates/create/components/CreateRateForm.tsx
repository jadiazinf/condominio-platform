'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useCreateSubscriptionRate } from '@packages/http-client'

const createRateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string(),
  condominiumRate: z.string().min(1),
  unitRate: z.string().min(1),
  userRate: z.string(),
  annualDiscountPercentage: z.string(),
  version: z.string().min(1).max(50),
  effectiveFrom: z.string().min(1),
  effectiveUntil: z.string(),
  isActive: z.boolean(),
})

export function CreateRateForm() {
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
      version: '',
      effectiveFrom: '',
      effectiveUntil: '',
      isActive: false,
    },
  })

  const createMutation = useCreateSubscriptionRate({
    onSuccess: () => {
      toast.success(t('superadmin.rates.form.success'))
      router.push('/dashboard/rates')
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

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography variant="h4" className="text-default-700">
              {t('superadmin.rates.form.fields.name.label')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.rates.form.fields.name.label')}
                    placeholder={t('superadmin.rates.form.fields.name.placeholder')}
                    errorMessage={
                      errors.name ? t('superadmin.rates.form.validation.name') : undefined
                    }
                    isRequired
                  />
                )}
              />

              <Controller
                name="version"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.rates.form.fields.version.label')}
                    placeholder={t('superadmin.rates.form.fields.version.placeholder')}
                    errorMessage={
                      errors.version ? t('superadmin.rates.form.validation.version') : undefined
                    }
                    isRequired
                  />
                )}
              />
            </div>

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value || ''}
                  label={t('superadmin.rates.form.fields.description.label')}
                  placeholder={t('superadmin.rates.form.fields.description.placeholder')}
                />
              )}
            />
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <Typography variant="h4" className="text-default-700">
              {t('superadmin.rates.table.condominiumRate')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Controller
                name="condominiumRate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label={t('superadmin.rates.form.fields.condominiumRate.label')}
                    placeholder={t('superadmin.rates.form.fields.condominiumRate.placeholder')}
                    startContent={<span className="text-default-400 text-sm">$</span>}
                    errorMessage={
                      errors.condominiumRate
                        ? t('superadmin.rates.form.validation.condominiumRate')
                        : undefined
                    }
                    isRequired
                  />
                )}
              />

              <Controller
                name="unitRate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label={t('superadmin.rates.form.fields.unitRate.label')}
                    placeholder={t('superadmin.rates.form.fields.unitRate.placeholder')}
                    startContent={<span className="text-default-400 text-sm">$</span>}
                    errorMessage={
                      errors.unitRate ? t('superadmin.rates.form.validation.unitRate') : undefined
                    }
                    isRequired
                  />
                )}
              />

              <Controller
                name="userRate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ''}
                    type="number"
                    label={t('superadmin.rates.form.fields.userRate.label')}
                    placeholder={t('superadmin.rates.form.fields.userRate.placeholder')}
                    startContent={<span className="text-default-400 text-sm">$</span>}
                  />
                )}
              />

              <Controller
                name="annualDiscountPercentage"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ''}
                    type="number"
                    label={t('superadmin.rates.form.fields.annualDiscountPercentage.label')}
                    placeholder={t(
                      'superadmin.rates.form.fields.annualDiscountPercentage.placeholder'
                    )}
                    endContent={<span className="text-default-400 text-sm">%</span>}
                  />
                )}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <Typography variant="h4" className="text-default-700">
              {t('superadmin.rates.form.fields.effectiveFrom.label')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="effectiveFrom"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    label={t('superadmin.rates.form.fields.effectiveFrom.label')}
                    placeholder={t('superadmin.rates.form.fields.effectiveFrom.placeholder')}
                    errorMessage={
                      errors.effectiveFrom
                        ? t('superadmin.rates.form.validation.effectiveFrom')
                        : undefined
                    }
                    isRequired
                  />
                )}
              />

              <Controller
                name="effectiveUntil"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ''}
                    type="date"
                    label={t('superadmin.rates.form.fields.effectiveUntil.label')}
                    placeholder={t('superadmin.rates.form.fields.effectiveUntil.placeholder')}
                  />
                )}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
            <Typography variant="body2">
              {t('superadmin.rates.form.fields.isActive.label')}
            </Typography>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              variant="flat"
              onPress={() => router.push('/dashboard/rates')}
              isDisabled={isSubmitting || createMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              type="submit"
              isLoading={isSubmitting || createMutation.isPending}
            >
              {createMutation.isPending
                ? t('superadmin.rates.form.submitting')
                : t('superadmin.rates.form.submit')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
