'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useCreateCurrency } from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Switch } from '@/ui/components/switch'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

const createCurrencySchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  symbol: z.string().max(10),
  decimals: z.string(),
  isBaseCurrency: z.boolean(),
})

export function CreateCurrencyForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCurrencySchema),
    defaultValues: {
      code: '',
      name: '',
      symbol: '',
      decimals: '2',
      isBaseCurrency: false,
    },
  })

  const createMutation = useCreateCurrency({
    onSuccess: () => {
      toast.success(t('superadmin.currencies.form.success'))
      router.push('/dashboard/currencies')
    },
    onError: (error: Error) => {
      toast.error(error.message || t('superadmin.currencies.form.error'))
    },
  })

  const onSubmit = (data: z.infer<typeof createCurrencySchema>) => {
    const payload: Record<string, unknown> = {
      code: data.code.toUpperCase(),
      name: data.name,
      decimals: parseInt(data.decimals) || 2,
      isBaseCurrency: data.isBaseCurrency ?? false,
      isActive: true,
    }

    if (data.symbol) {
      payload.symbol = data.symbol
    }

    createMutation.mutate(payload as any)
  }

  return (
    <Card>
      <CardBody>
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Information */}
          <div className="space-y-4 flex flex-col gap-2">
            <Typography className="text-default-700" variant="h4">
              {t('superadmin.currencies.form.createSubtitle')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="code"
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    errorMessage={
                      errors.code ? t('superadmin.currencies.form.validation.code') : undefined
                    }
                    label={t('superadmin.currencies.form.fields.code.label')}
                    placeholder={t('superadmin.currencies.form.fields.code.placeholder')}
                  />
                )}
              />

              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    errorMessage={
                      errors.name ? t('superadmin.currencies.form.validation.name') : undefined
                    }
                    label={t('superadmin.currencies.form.fields.name.label')}
                    placeholder={t('superadmin.currencies.form.fields.name.placeholder')}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="symbol"
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.currencies.form.fields.symbol.label')}
                    placeholder={t('superadmin.currencies.form.fields.symbol.placeholder')}
                    value={field.value || ''}
                  />
                )}
              />

              <Controller
                control={control}
                name="decimals"
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.currencies.form.fields.decimals.label')}
                    placeholder={t('superadmin.currencies.form.fields.decimals.placeholder')}
                    type="number"
                  />
                )}
              />
            </div>
          </div>

          {/* Base Currency toggle */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isBaseCurrency"
              render={({ field }) => (
                <Switch isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
            <Typography variant="body2">
              {t('superadmin.currencies.form.fields.isBaseCurrency.label')}
            </Typography>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              isDisabled={isSubmitting || createMutation.isPending}
              variant="flat"
              onPress={() => router.push('/dashboard/currencies')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              isLoading={isSubmitting || createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending
                ? t('superadmin.currencies.form.submitting')
                : t('superadmin.currencies.form.submit')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
