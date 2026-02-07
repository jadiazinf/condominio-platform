'use client'

import { usePathname } from 'next/navigation'
import { Tabs, Tab } from '@/ui/components/tabs'
import { useTranslation } from '@/contexts'
import { useRouter } from 'next/navigation'
import { Key } from 'react'

const tabRoutes = [
  { key: 'currencies', href: '/dashboard/currencies' },
  { key: 'currentRates', href: '/dashboard/currencies/exchange-rates' },
  { key: 'rateHistory', href: '/dashboard/currencies/exchange-rates/history' },
] as const

export function CurrencyTabs() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()

  const selectedKey =
    tabRoutes.find((tab) => pathname === tab.href)?.key ??
    (pathname.startsWith('/dashboard/currencies/exchange-rates/history')
      ? 'rateHistory'
      : pathname.startsWith('/dashboard/currencies/exchange-rates')
        ? 'currentRates'
        : 'currencies')

  function handleSelectionChange(key: Key) {
    const tab = tabRoutes.find((t) => t.key === key)
    if (tab) {
      router.push(tab.href)
    }
  }

  return (
    <Tabs
      aria-label={t('superadmin.currencies.title')}
      selectedKey={selectedKey}
      onSelectionChange={handleSelectionChange}
      variant="underlined"
      color="primary"
    >
      <Tab key="currencies" title={t('superadmin.currencies.tabs.currencies')} />
      <Tab key="currentRates" title={t('superadmin.currencies.tabs.currentRates')} />
      <Tab key="rateHistory" title={t('superadmin.currencies.tabs.rateHistory')} />
    </Tabs>
  )
}
