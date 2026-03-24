'use client'

import { useState, useEffect } from 'react'
import { useActiveCurrencies, useUpdateMyCompanyPreferredCurrency } from '@packages/http-client'

import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Select } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { getSessionCookie } from '@/libs/cookies/session-cookie'

interface PreferredCurrencySelectorProps {
  managementCompanyId: string
  currentPreferredCurrencyId: string | null
}

export function PreferredCurrencySelector({
  managementCompanyId,
  currentPreferredCurrencyId,
}: PreferredCurrencySelectorProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string | null>(
    currentPreferredCurrencyId
  )

  useEffect(() => {
    setToken(getSessionCookie() || '')
  }, [])

  const { data: currenciesData, isLoading: currenciesLoading } = useActiveCurrencies({
    enabled: !!token,
  })

  const updateMutation = useUpdateMyCompanyPreferredCurrency({
    token,
    managementCompanyId,
  })

  const currencies = currenciesData?.data ?? []
  const hasChanged = selectedCurrencyId !== currentPreferredCurrencyId

  const items = [
    {
      key: '__none__',
      label: t('admin.company.myCompany.general.preferredCurrency.noPreference'),
    },
    ...currencies.map(c => ({
      key: c.id,
      label: `${c.name} (${c.symbol})`,
    })),
  ]

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        currencyId: selectedCurrencyId,
      })
      toast.success(t('admin.company.myCompany.general.preferredCurrency.updateSuccess'))
    } catch {
      toast.error(t('admin.company.myCompany.general.preferredCurrency.updateError'))
    }
  }

  return (
    <Card className="p-6">
      <Typography className="mb-2" variant="h4">
        {t('admin.company.myCompany.general.preferredCurrency.title')}
      </Typography>
      <Typography className="mb-4" color="muted" variant="body2">
        {t('admin.company.myCompany.general.preferredCurrency.description')}
      </Typography>

      <div className="flex items-end gap-3">
        <Select
          className="max-w-xs"
          isLoading={currenciesLoading}
          items={items}
          label={t('admin.company.myCompany.general.preferredCurrency.label')}
          placeholder={t('admin.company.myCompany.general.preferredCurrency.placeholder')}
          value={selectedCurrencyId ?? '__none__'}
          onChange={key => setSelectedCurrencyId(key === '__none__' ? null : key)}
        />
        {hasChanged && (
          <Button
            color="primary"
            isLoading={updateMutation.isPending}
            size="md"
            onPress={handleSave}
          >
            {updateMutation.isPending
              ? t('admin.company.myCompany.general.preferredCurrency.saving')
              : t('common.save')}
          </Button>
        )}
      </div>
    </Card>
  )
}
