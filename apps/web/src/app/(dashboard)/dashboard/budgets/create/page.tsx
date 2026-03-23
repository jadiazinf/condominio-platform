import { redirect } from 'next/navigation'

import { CreateBudgetClient } from './components/CreateBudgetClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function CreateBudgetPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.createBudget'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    back: t(`${p}.back`),
    form: {
      name: t(`${p}.form.name`),
      namePlaceholder: t(`${p}.form.namePlaceholder`),
      description: t(`${p}.form.description`),
      type: t(`${p}.form.type`),
      year: t(`${p}.form.year`),
      month: t(`${p}.form.month`),
      currency: t(`${p}.form.currency`),
      reserveFund: t(`${p}.form.reserveFund`),
      notes: t(`${p}.form.notes`),
    },
    items: {
      title: t(`${p}.items.title`),
      add: t(`${p}.items.add`),
      description: t(`${p}.items.description`),
      amount: t(`${p}.items.amount`),
      remove: t(`${p}.items.remove`),
    },
    submit: t(`${p}.submit`),
    success: t(`${p}.success`),
    error: t(`${p}.error`),
    types: {
      monthly: t('admin.budgets.types.monthly'),
      quarterly: t('admin.budgets.types.quarterly'),
      annual: t('admin.budgets.types.annual'),
    },
    months: {
      '1': t(`${p}.months.1`),
      '2': t(`${p}.months.2`),
      '3': t(`${p}.months.3`),
      '4': t(`${p}.months.4`),
      '5': t(`${p}.months.5`),
      '6': t(`${p}.months.6`),
      '7': t(`${p}.months.7`),
      '8': t(`${p}.months.8`),
      '9': t(`${p}.months.9`),
      '10': t(`${p}.months.10`),
      '11': t(`${p}.months.11`),
      '12': t(`${p}.months.12`),
    },
  }

  return <CreateBudgetClient translations={translations} />
}
