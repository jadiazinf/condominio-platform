'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useCreateExchangeRate, useCurrencies } from '@packages/http-client'

const createExchangeRateSchema = z
  .object({
    fromCurrencyId: z.string().min(1),
    toCurrencyId: z.string().min(1),
    rate: z.string().min(1),
    effectiveDate: z.string().min(1),
    source: z.string().max(100).optional(),
  })
  .refine((data) => data.fromCurrencyId !== data.toCurrencyId, {
    path: ['toCurrencyId'],
    message: 'sameCurrency',
  })

export function CreateExchangeRateForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()

  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies()

  const currencyItems: ISelectItem[] = useMemo(
    () =>
      (currenciesData?.data ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({
          key: c.id,
          label: `${c.code} - ${c.name}`,
        })),
    [currenciesData]
  )

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createExchangeRateSchema),
    defaultValues: {
      fromCurrencyId: '',
      toCurrencyId: '',
      rate: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      source: '',
    },
  })

  const createMutation = useCreateExchangeRate({
    onSuccess: () => {
      toast.success(t('superadmin.currencies.exchangeRates.form.success'))
      router.push('/dashboard/currencies/exchange-rates')
    },
    onError: (error: Error) => {
      toast.error(error.message || t('superadmin.currencies.exchangeRates.form.error'))
    },
  })

  const onSubmit = (data: z.infer<typeof createExchangeRateSchema>) => {
    const payload: Record<string, unknown> = {
      fromCurrencyId: data.fromCurrencyId,
      toCurrencyId: data.toCurrencyId,
      rate: data.rate,
      effectiveDate: data.effectiveDate,
    }

    if (data.source) {
      payload.source = data.source
    }

    createMutation.mutate(payload as any)
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4 flex flex-col gap-2">
            <Typography variant="h4" className="text-default-700">
              {t('superadmin.currencies.exchangeRates.form.createSubtitle')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="fromCurrencyId"
                control={control}
                render={({ field }) => (
                  <Select
                    items={currencyItems}
                    label={t('superadmin.currencies.exchangeRates.form.fields.fromCurrency.label')}
                    placeholder={t('superadmin.currencies.exchangeRates.form.fields.fromCurrency.placeholder')}
                    value={field.value}
                    onChange={(key) => field.onChange(key ?? '')}
                    isLoading={currenciesLoading}
                    errorMessage={
                      errors.fromCurrencyId
                        ? t('superadmin.currencies.exchangeRates.form.validation.fromCurrency')
                        : undefined
                    }
                    isRequired
                  />
                )}
              />

              <Controller
                name="toCurrencyId"
                control={control}
                render={({ field }) => (
                  <Select
                    items={currencyItems}
                    label={t('superadmin.currencies.exchangeRates.form.fields.toCurrency.label')}
                    placeholder={t('superadmin.currencies.exchangeRates.form.fields.toCurrency.placeholder')}
                    value={field.value}
                    onChange={(key) => field.onChange(key ?? '')}
                    isLoading={currenciesLoading}
                    errorMessage={
                      errors.toCurrencyId
                        ? t(
                            errors.toCurrencyId.message === 'sameCurrency'
                              ? 'superadmin.currencies.exchangeRates.form.validation.sameCurrency'
                              : 'superadmin.currencies.exchangeRates.form.validation.toCurrency'
                          )
                        : undefined
                    }
                    isRequired
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="rate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label={t('superadmin.currencies.exchangeRates.form.fields.rate.label')}
                    placeholder={t('superadmin.currencies.exchangeRates.form.fields.rate.placeholder')}
                    errorMessage={
                      errors.rate
                        ? t('superadmin.currencies.exchangeRates.form.validation.rate')
                        : undefined
                    }
                    isRequired
                  />
                )}
              />

              <Controller
                name="effectiveDate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    label={t('superadmin.currencies.exchangeRates.form.fields.effectiveDate.label')}
                    placeholder={t('superadmin.currencies.exchangeRates.form.fields.effectiveDate.placeholder')}
                    errorMessage={
                      errors.effectiveDate
                        ? t('superadmin.currencies.exchangeRates.form.validation.effectiveDate')
                        : undefined
                    }
                    isRequired
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ''}
                    label={t('superadmin.currencies.exchangeRates.form.fields.source.label')}
                    placeholder={t('superadmin.currencies.exchangeRates.form.fields.source.placeholder')}
                  />
                )}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              variant="flat"
              onPress={() => router.push('/dashboard/currencies/exchange-rates')}
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
                ? t('superadmin.currencies.exchangeRates.form.submitting')
                : t('superadmin.currencies.exchangeRates.form.submit')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
