'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input, CurrencyInput } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { Divider } from '@/ui/components/divider'
import { Card, CardBody } from '@/ui/components/card'
import { Spinner } from '@/ui/components/spinner'
import { Tooltip } from '@/ui/components/tooltip'
import {
  DollarSign,
  Building2,
  Home,
  Users,
  Calculator,
  Percent,
  Tag,
  AlertCircle,
  Info,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useSubscriptionPricing, type IPricingQuery } from '@packages/http-client'
import type { ISubscriptionFormData } from '../../hooks'
import { useSubscriptionRates } from '@packages/http-client/hooks'

interface PricingStepFormProps {
  companyId: string
  shouldShowError: (field: keyof ISubscriptionFormData) => boolean
  translateError: (field: keyof ISubscriptionFormData) => string | undefined
}

// Custom hook for debouncing a value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function PricingStepForm({
  companyId,
  shouldShowError,
  translateError,
}: PricingStepFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { control, watch, setValue, getValues } = useFormContext<ISubscriptionFormData>()
  const discountType = watch('discountType')
  const discountValue = watch('discountValue')
  const billingCycle = watch('billingCycle')
  const maxCondominiums = watch('maxCondominiums')
  const maxUnits = watch('maxUnits')
  const maxUsers = watch('maxUsers')
  const selectedRateId = watch('rateId')
  const hasAutoFilledPrice = useRef(false)

  // Fetch active subscription rates for the dropdown
  const { data: ratesData, isLoading: isLoadingRates } = useSubscriptionRates({
    query: { isActive: true, limit: 100 },
    enabled: true,
  })

  // Debounce the discount value to avoid API calls on every keystroke
  const debouncedDiscountValue = useDebounce(discountValue, 500)

  // Build pricing query based on discount settings, billing cycle, and subscription limits
  const pricingQuery = useMemo<IPricingQuery>(() => {
    const query: IPricingQuery = {}

    // Include selected rate ID if available
    if (selectedRateId) {
      query.rateId = selectedRateId
    }

    // Include billing cycle for annual discount calculation
    if (billingCycle) {
      query.billingCycle = billingCycle
    }

    // Include subscription limits (maxCondominiums, maxUnits, maxUsers)
    if (maxCondominiums) {
      const condoCount = parseInt(maxCondominiums, 10)
      if (!isNaN(condoCount) && condoCount > 0) {
        query.condominiumCount = condoCount
      }
    }
    if (maxUnits) {
      const unitCountVal = parseInt(maxUnits, 10)
      if (!isNaN(unitCountVal) && unitCountVal > 0) {
        query.unitCount = unitCountVal
      }
    }
    if (maxUsers) {
      const userCountVal = parseInt(maxUsers, 10)
      if (!isNaN(userCountVal) && userCountVal > 0) {
        query.userCount = userCountVal
      }
    }

    // Include manual discount
    if (discountType && discountType !== 'none') {
      query.discountType = discountType
      if (debouncedDiscountValue && parseFloat(debouncedDiscountValue) > 0) {
        query.discountValue = parseFloat(debouncedDiscountValue)
      }
    }

    return query
  }, [
    selectedRateId,
    billingCycle,
    maxCondominiums,
    maxUnits,
    maxUsers,
    discountType,
    debouncedDiscountValue,
  ])

  // Fetch pricing data
  const {
    data: pricingData,
    isLoading: isPricingLoading,
    isError: isPricingError,
    error: pricingError,
  } = useSubscriptionPricing(companyId, {
    query: pricingQuery,
    enabled: !!companyId,
  })

  const pricing = pricingData?.data

  // Check if error is due to no rates configured
  const isNoRateConfiguredError = pricingError?.message?.includes('No hay tarifas')

  // Track pricing error state in form to block advancement
  // Also clear basePrice when there's an error (no rates configured)
  useEffect(() => {
    setValue('pricingError', isPricingError)
    if (isPricingError) {
      setValue('basePrice', '')
      hasAutoFilledPrice.current = false
    }
  }, [isPricingError, setValue])

  // Update form values when pricing data changes (only metadata, not the price)
  useEffect(() => {
    if (pricing) {
      setValue('pricingCondominiumCount', pricing.condominiumCount)
      setValue('pricingUnitCount', pricing.unitCount)
      setValue('pricingCondominiumRate', pricing.condominiumRate)
      setValue('pricingUnitRate', pricing.unitRate)
      setValue('calculatedPrice', pricing.calculatedPrice)
      setValue('discountAmount', pricing.discountAmount)
      setValue('annualDiscountAmount', pricing.annualDiscountAmount)
      // Don't override rateId - user selects it manually via the dropdown

      // Only auto-fill basePrice once, when it's empty and we haven't auto-filled before
      if (!hasAutoFilledPrice.current) {
        const currentBasePrice = getValues('basePrice')
        if (!currentBasePrice || currentBasePrice === '') {
          setValue('basePrice', pricing.finalPrice.toFixed(2))
          hasAutoFilledPrice.current = true
        }
      }
    }
  }, [pricing, setValue, getValues])

  const discountTypeItems: ISelectItem[] = [
    { key: 'none', label: t('superadmin.companies.subscription.form.discount.none') },
    { key: 'percentage', label: t('superadmin.companies.subscription.form.discount.percentage') },
    { key: 'fixed', label: t('superadmin.companies.subscription.form.discount.fixed') },
  ]

  // Transform rates data into select items with rich information
  const rateItems: ISelectItem[] = useMemo(() => {
    if (!ratesData?.data) return []
    return ratesData.data.map(rate => {
      // Build description with pricing info
      const priceInfo = `$${rate.condominiumRate}/condo · $${rate.unitRate}/unidad · $${rate.userRate}/usuario`
      const tierInfo = rate.minCondominiums && rate.maxCondominiums
        ? ` • ${rate.minCondominiums}-${rate.maxCondominiums} condos`
        : rate.minCondominiums
        ? ` • ${rate.minCondominiums}+ condos`
        : ''

      return {
        key: rate.id,
        label: `${rate.name} (v${rate.version})`,
        description: `${priceInfo}${tierInfo}${rate.description ? ` • ${rate.description}` : ''}`,
        startContent: (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Tag className="text-primary" size={14} />
          </div>
        ),
      }
    })
  }, [ratesData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getBillingMonthsLabel = () => {
    switch (billingCycle) {
      case 'monthly':
        return t('superadmin.companies.subscription.form.pricing.billingMonthsMonthly')
      case 'quarterly':
        return '3 meses (trimestral)'
      case 'semi_annual':
        return '6 meses (semestral)'
      case 'annual':
        return t('superadmin.companies.subscription.form.pricing.billingMonthsAnnual')
      case 'custom':
        return '1 mes (personalizado)'
      default:
        return t('superadmin.companies.subscription.form.pricing.billingMonthsMonthly')
    }
  }

  const getBillingMonthsForFormula = () => {
    switch (billingCycle) {
      case 'monthly':
        return '1 mes'
      case 'quarterly':
        return '3 meses'
      case 'semi_annual':
        return '6 meses'
      case 'annual':
        return '12 meses'
      case 'custom':
        return '1 mes'
      default:
        return '1 mes'
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Rate Selector Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.fields.rate.label')}
          </Typography>
          <Typography variant="caption" color="muted">
            {selectedRateId
              ? t('superadmin.companies.subscription.form.fields.rate.description')
              : t('superadmin.companies.subscription.form.fields.rate.descriptionDefault')}
          </Typography>
        </div>

        <Card>
          <CardBody>
            <Controller
              name="rateId"
              control={control}
              render={({ field }) => (
                <Select
                  aria-label={t('superadmin.companies.subscription.form.fields.rate.label')}
                  placeholder={t(
                    'superadmin.companies.subscription.form.fields.rate.placeholder'
                  )}
                  items={rateItems}
                  value={field.value ?? undefined}
                  onChange={value => field.onChange(value)}
                  isLoading={isLoadingRates}
                />
              )}
            />
          </CardBody>
        </Card>
      </div>

      <Divider className="my-12" />

      {/* Pricing Calculator Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.pricing')}
          </Typography>
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.pricingDescription')}
          </Typography>
        </div>

        <Card className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10">
          <CardBody className="space-y-6">
            {isPricingLoading && !pricing ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : isPricingError ? (
              <div className="rounded-lg bg-danger-50 border border-danger-200 p-4 dark:bg-danger-900/20 dark:border-danger-800/30">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-danger mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <Typography variant="subtitle2" className="text-danger">
                      {isNoRateConfiguredError
                        ? t('superadmin.companies.subscription.form.pricing.noRateConfigured.title')
                        : t('superadmin.companies.subscription.form.pricing.error')}
                    </Typography>
                    {isNoRateConfiguredError && (
                      <>
                        <Typography variant="body2" color="muted">
                          {t(
                            'superadmin.companies.subscription.form.pricing.noRateConfigured.description'
                          )}
                        </Typography>
                        <Typography variant="caption" color="muted" className="block">
                          {t(
                            'superadmin.companies.subscription.form.pricing.noRateConfigured.instruction'
                          )}
                        </Typography>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : pricing ? (
              <>
                {/* Rate info badge */}
                {pricing.rateName && (
                  <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 p-3 dark:from-emerald-900/20 dark:to-teal-900/10 dark:border-emerald-800/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-200/50 dark:bg-emerald-800/30">
                      <Tag className="text-emerald-600 dark:text-emerald-400" size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Typography
                          variant="subtitle2"
                          className="text-emerald-700 dark:text-emerald-300"
                        >
                          {t('superadmin.companies.subscription.form.pricing.rateApplied')}:{' '}
                          {pricing.rateName}
                        </Typography>
                        {pricing.rateVersion && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300">
                            v{pricing.rateVersion}
                          </span>
                        )}
                      </div>
                      {pricing.rateDescription && (
                        <Typography variant="caption" color="muted">
                          {pricing.rateDescription}
                        </Typography>
                      )}
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <div className="text-default-500">
                        {t('superadmin.companies.subscription.form.pricing.condominiumRate')}:{' '}
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(pricing.condominiumRate)}
                        </span>
                      </div>
                      <div className="text-default-500">
                        {t('superadmin.companies.subscription.form.pricing.unitRate')}:{' '}
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(pricing.unitRate)}
                        </span>
                      </div>
                      <div className="text-default-500">
                        {t('superadmin.companies.subscription.form.pricing.userRate')}:{' '}
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(pricing.userRate)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formula explanation */}
                <div className="rounded-lg bg-blue-50/50 border border-blue-200/50 p-4 dark:bg-blue-900/10 dark:border-blue-800/30">
                  <div className="flex items-start gap-2">
                    <Tooltip
                      content={
                        <div className="max-w-xs space-y-2 p-1">
                          <p className="font-semibold">
                            {t(
                              'superadmin.companies.subscription.form.pricing.formulaTooltip.title'
                            )}
                          </p>
                          <ul className="text-xs space-y-1.5">
                            <li>
                              <span className="text-primary font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.condominiums'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.condominiumsDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-primary font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.condominiumRate'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.condominiumRateDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-secondary font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.units'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.unitsDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-secondary font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.unitRate'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.unitRateDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-warning font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.users'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.usersDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-warning font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.userRate'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.userRateDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.months'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.monthsDesc'
                              )}
                            </li>
                            <li>
                              <span className="text-success font-medium">
                                {t(
                                  'superadmin.companies.subscription.form.pricing.formulaTooltip.discount'
                                )}
                              </span>
                              :{' '}
                              {t(
                                'superadmin.companies.subscription.form.pricing.formulaTooltip.discountDesc'
                              )}
                            </li>
                          </ul>
                        </div>
                      }
                    >
                      <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0 cursor-help" />
                    </Tooltip>
                    <div className="space-y-1">
                      <Typography variant="subtitle2" className="text-blue-700 dark:text-blue-300">
                        {t('superadmin.companies.subscription.form.pricing.formula')}
                      </Typography>
                      <Typography variant="caption" color="muted">
                        {t('superadmin.companies.subscription.form.pricing.formulaDescription')}
                      </Typography>
                      <div className="font-mono text-xs bg-white/70 dark:bg-default-100/50 rounded px-3 py-2 mt-1 flex flex-wrap items-center gap-1">
                        <span>[(</span>
                        <span className="text-primary font-semibold">Condominios</span>
                        <span>×</span>
                        <span className="text-primary font-semibold">TarifaCondo</span>
                        <span>) + (</span>
                        <span className="text-secondary font-semibold">Unidades</span>
                        <span>×</span>
                        <span className="text-secondary font-semibold">TarifaUnidad</span>
                        <span>) + (</span>
                        <span className="text-warning font-semibold">Usuarios</span>
                        <span>×</span>
                        <span className="text-warning font-semibold">TarifaUsuario</span>
                        <span>)] ×</span>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">
                          {getBillingMonthsForFormula()}
                        </span>
                        <span>-</span>
                        <span className="text-success font-semibold">Descuentos</span>
                        <span>= Precio Final</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Counts */}
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 dark:bg-default-100/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-200/50">
                      <Building2 className="text-primary" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Typography variant="caption" color="muted">
                          {t('superadmin.companies.subscription.form.pricing.condominiums')}
                        </Typography>
                        <Tooltip
                          content={t(
                            'superadmin.companies.subscription.form.pricing.condominiumsDescription'
                          )}
                        >
                          <Info size={12} className="text-default-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <Typography variant="h4">{pricing.condominiumCount}</Typography>
                    </div>
                    <div className="ml-auto text-right">
                      <Typography variant="caption" color="muted">
                        × {formatCurrency(pricing.condominiumRate)}
                      </Typography>
                      <Typography variant="body2" className="font-semibold text-primary">
                        = {formatCurrency(pricing.condominiumSubtotal)}
                      </Typography>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 dark:bg-default-100/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-200/50">
                      <Home className="text-secondary" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Typography variant="caption" color="muted">
                          {t('superadmin.companies.subscription.form.pricing.units')}
                        </Typography>
                        <Tooltip
                          content={t(
                            'superadmin.companies.subscription.form.pricing.unitsDescription'
                          )}
                        >
                          <Info size={12} className="text-default-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <Typography variant="h4">{pricing.unitCount}</Typography>
                    </div>
                    <div className="ml-auto text-right">
                      <Typography variant="caption" color="muted">
                        × {formatCurrency(pricing.unitRate)}
                      </Typography>
                      <Typography variant="body2" className="font-semibold text-secondary">
                        = {formatCurrency(pricing.unitSubtotal)}
                      </Typography>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 dark:bg-default-100/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-200/50">
                      <Users className="text-warning" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Typography variant="caption" color="muted">
                          {t('superadmin.companies.subscription.form.pricing.users')}
                        </Typography>
                        <Tooltip
                          content={t(
                            'superadmin.companies.subscription.form.pricing.usersDescription'
                          )}
                        >
                          <Info size={12} className="text-default-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <Typography variant="h4">{pricing.userCount}</Typography>
                    </div>
                    <div className="ml-auto text-right">
                      <Typography variant="caption" color="muted">
                        × {formatCurrency(pricing.userRate)}
                      </Typography>
                      <Typography variant="body2" className="font-semibold text-warning">
                        = {formatCurrency(pricing.userSubtotal)}
                      </Typography>
                    </div>
                  </div>
                </div>

                {/* Monthly Base Price and Billing Months */}
                <div className="rounded-lg bg-purple-50/50 border border-purple-200/50 p-4 dark:bg-purple-900/10 dark:border-purple-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Typography variant="body2" color="muted">
                        {t('superadmin.companies.subscription.form.pricing.monthlyBasePrice')}
                      </Typography>
                      <Typography variant="h4" className="text-purple-700 dark:text-purple-300">
                        {formatCurrency(pricing.monthlyBasePrice)}
                      </Typography>
                    </div>
                    <div className="text-center px-4">
                      <Typography variant="h3" className="text-purple-600 dark:text-purple-400">
                        ×
                      </Typography>
                    </div>
                    <div className="flex-1 text-center">
                      <Typography variant="body2" color="muted">
                        {t('superadmin.companies.subscription.form.pricing.billingMonths')}
                      </Typography>
                      <Typography variant="h4" className="text-purple-700 dark:text-purple-300">
                        {getBillingMonthsLabel()}
                      </Typography>
                    </div>
                    <div className="text-center px-4">
                      <Typography variant="h3" className="text-purple-600 dark:text-purple-400">
                        =
                      </Typography>
                    </div>
                    <div className="flex-1 text-right">
                      <Typography variant="body2" color="muted">
                        {t('superadmin.companies.subscription.form.pricing.subtotal')}
                      </Typography>
                      <Typography variant="h3" className="text-purple-700 dark:text-purple-300">
                        {formatCurrency(pricing.calculatedPrice)}
                      </Typography>
                    </div>
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="rounded-lg bg-white/70 p-4 dark:bg-default-100/70">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="text-default-500" size={18} />
                    <Typography variant="subtitle2">
                      {t('superadmin.companies.subscription.form.pricing.breakdown')}
                    </Typography>
                    {isPricingLoading && <Spinner size="sm" className="ml-2" />}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-default-500">
                        {t('superadmin.companies.subscription.form.pricing.subtotal')}
                      </span>
                      <span className="font-medium">{formatCurrency(pricing.calculatedPrice)}</span>
                    </div>

                    {pricing.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm text-success">
                        <span className="flex items-center gap-1">
                          <Tag size={14} />
                          {t('superadmin.companies.subscription.form.pricing.discount')}
                          {pricing.discountType === 'percentage'
                            ? ` (${pricing.discountValue}%)`
                            : ` (${formatCurrency(pricing.discountValue ?? 0)})`}
                        </span>
                        <span>-{formatCurrency(pricing.discountAmount)}</span>
                      </div>
                    )}

                    {pricing.annualDiscountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm text-success">
                        <span className="flex items-center gap-1">
                          <Tag size={14} />
                          {t('superadmin.companies.subscription.form.pricing.annualDiscount')} (
                          {pricing.annualDiscountPercentage}%)
                        </span>
                        <span>-{formatCurrency(pricing.annualDiscountAmount)}</span>
                      </div>
                    )}

                    <Divider className="my-2" />

                    <div className="flex items-center justify-between">
                      <Typography variant="subtitle1">
                        {t('superadmin.companies.subscription.form.pricing.suggestedPrice')}
                      </Typography>
                      <Typography variant="h3" className="text-primary">
                        {formatCurrency(pricing.finalPrice)}
                      </Typography>
                    </div>
                  </div>
                </div>

                {/* Discount controls */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <Controller
                    name="discountType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        aria-label={t('superadmin.companies.subscription.form.discount.type')}
                        label={t('superadmin.companies.subscription.form.discount.type')}
                        items={discountTypeItems}
                        value={field.value}
                        onChange={key => field.onChange(key ?? 'none')}
                      />
                    )}
                  />

                  {discountType === 'percentage' && (
                    <Controller
                      name="discountValue"
                      control={control}
                      rules={{
                        validate: value => {
                          if (!value || value === '') return true
                          const numValue = parseFloat(value)
                          if (isNaN(numValue) || numValue <= 0) return true
                          if (numValue > 100) {
                            return t(
                              'superadmin.companies.subscription.form.validation.discount.maxPercentage'
                            )
                          }
                          return true
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <Input
                          label={t('superadmin.companies.subscription.form.discount.value')}
                          placeholder={t(
                            'superadmin.companies.subscription.form.discount.percentagePlaceholder'
                          )}
                          type="number"
                          value={field.value}
                          onValueChange={field.onChange}
                          startContent={<Percent className="text-default-400" size={16} />}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      )}
                    />
                  )}

                  {discountType === 'fixed' && (
                    <Controller
                      name="discountValue"
                      control={control}
                      rules={{
                        validate: value => {
                          if (!value || value === '') return true
                          const numValue = parseFloat(value)
                          if (isNaN(numValue) || numValue <= 0) return true
                          if (pricing && numValue > pricing.calculatedPrice) {
                            return t(
                              'superadmin.companies.subscription.form.validation.discount.maxFixed'
                            )
                          }
                          return true
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <CurrencyInput
                          label={t('superadmin.companies.subscription.form.discount.value')}
                          value={field.value}
                          onValueChange={field.onChange}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      )}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Typography variant="body2" color="muted">
                  {t('superadmin.companies.subscription.form.pricing.noData')}
                </Typography>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Divider className="my-12" />

      {/* Final Price Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.finalPrice')}
          </Typography>
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.finalPriceDescription')}
          </Typography>
        </div>

        <div className="flex items-start gap-3">
          <Controller
            name="basePrice"
            control={control}
            rules={{
              required: t('superadmin.companies.subscription.form.validation.basePrice.required'),
              validate: value => {
                const numValue = parseFloat(value)
                if (isNaN(numValue) || numValue < 0.01) {
                  return t('superadmin.companies.subscription.form.validation.basePrice.min')
                }
                return true
              },
            }}
            render={({ field }) => (
              <CurrencyInput
                label={t('superadmin.companies.subscription.form.fields.basePrice')}
                value={field.value}
                onValueChange={field.onChange}
                isRequired
                isInvalid={shouldShowError('basePrice')}
                errorMessage={translateError('basePrice')}
                description={
                  pricing?.finalPrice && field.value !== pricing.finalPrice.toFixed(2)
                    ? t('superadmin.companies.subscription.form.fields.basePriceModified')
                    : undefined
                }
                className="max-w-md"
              />
            )}
          />
          <Tooltip content={t('superadmin.companies.subscription.form.fields.resetToCalculated')}>
            <Button
              type="button"
              variant="flat"
              color="primary"
              isIconOnly
              className="mt-6"
              onPress={() => {
                if (pricing) {
                  setValue('basePrice', pricing.finalPrice.toFixed(2))
                } else {
                  toast.error(t('superadmin.companies.subscription.form.pricing.resetNoRates'))
                }
              }}
            >
              <RotateCcw size={18} />
            </Button>
          </Tooltip>
        </div>
      </div>

      <Divider className="my-12" />

      {/* Pricing Notes Section */}
      <div className="space-y-6">
        <div>
          <Typography variant="subtitle2">
            {t('superadmin.companies.subscription.form.sections.pricingNotes')}
          </Typography>
          <Typography variant="caption" color="muted">
            {t('superadmin.companies.subscription.form.sections.pricingNotesDescription')}
          </Typography>
        </div>

        <Controller
          name="pricingNotes"
          control={control}
          render={({ field }) => (
            <textarea
              placeholder={t(
                'superadmin.companies.subscription.form.fields.pricingNotesPlaceholder'
              )}
              value={field.value}
              onChange={e => field.onChange(e.target.value)}
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
