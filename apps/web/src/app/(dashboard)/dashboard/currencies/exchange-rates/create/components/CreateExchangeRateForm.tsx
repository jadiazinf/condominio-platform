'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useCreateExchangeRate, useCurrencies } from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { DatePicker } from '@/ui/components/date-picker'
import { Typography } from '@/ui/components/typography'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'

const createExchangeRateSchema = z
  .object({
    fromCurrencyId: z.string().min(1),
    toCurrencyId: z.string().min(1),
    rate: z.string().min(1),
    effectiveDate: z.string().min(1),
    source: z.string().max(100).optional(),
  })
  .refine(data => data.fromCurrencyId !== data.toCurrencyId, {
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
        .filter(c => c.isActive)
        .map(c => ({
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
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 flex flex-col gap-2">
            <Typography className="text-default-700" variant="h4">
              {t('superadmin.currencies.exchangeRates.form.createSubtitle')}
            </Typography>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="fromCurrencyId"
                render={({ field }) => (
                  <Select
                    isRequired
                    errorMessage={
                      errors.fromCurrencyId
                        ? t('superadmin.currencies.exchangeRates.form.validation.fromCurrency')
                        : undefined
                    }
                    isLoading={currenciesLoading}
                    items={currencyItems}
                    label={t('superadmin.currencies.exchangeRates.form.fields.fromCurrency.label')}
                    placeholder={t(
                      'superadmin.currencies.exchangeRates.form.fields.fromCurrency.placeholder'
                    )}
                    value={field.value}
                    onChange={key => field.onChange(key ?? '')}
                  />
                )}
              />

              <Controller
                control={control}
                name="toCurrencyId"
                render={({ field }) => (
                  <Select
                    isRequired
                    errorMessage={
                      errors.toCurrencyId
                        ? t(
                            errors.toCurrencyId.message === 'sameCurrency'
                              ? 'superadmin.currencies.exchangeRates.form.validation.sameCurrency'
                              : 'superadmin.currencies.exchangeRates.form.validation.toCurrency'
                          )
                        : undefined
                    }
                    isLoading={currenciesLoading}
                    items={currencyItems}
                    label={t('superadmin.currencies.exchangeRates.form.fields.toCurrency.label')}
                    placeholder={t(
                      'superadmin.currencies.exchangeRates.form.fields.toCurrency.placeholder'
                    )}
                    value={field.value}
                    onChange={key => field.onChange(key ?? '')}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="rate"
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    errorMessage={
                      errors.rate
                        ? t('superadmin.currencies.exchangeRates.form.validation.rate')
                        : undefined
                    }
                    label={t('superadmin.currencies.exchangeRates.form.fields.rate.label')}
                    placeholder={t(
                      'superadmin.currencies.exchangeRates.form.fields.rate.placeholder'
                    )}
                    type="number"
                  />
                )}
              />

              <Controller
                control={control}
                name="effectiveDate"
                render={({ field }) => (
                  <DatePicker
                    isRequired
                    errorMessage={
                      errors.effectiveDate
                        ? t('superadmin.currencies.exchangeRates.form.validation.effectiveDate')
                        : undefined
                    }
                    label={t('superadmin.currencies.exchangeRates.form.fields.effectiveDate.label')}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('superadmin.currencies.exchangeRates.form.fields.source.label')}
                    placeholder={t(
                      'superadmin.currencies.exchangeRates.form.fields.source.placeholder'
                    )}
                    value={field.value || ''}
                  />
                )}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              isDisabled={isSubmitting || createMutation.isPending}
              variant="flat"
              onPress={() => router.push('/dashboard/currencies/exchange-rates')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              isLoading={isSubmitting || createMutation.isPending}
              type="submit"
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
