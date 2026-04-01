import { redirect } from 'next/navigation'
import { BillingChannelsListClient } from './components/BillingChannelsListClient'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function BillingChannelsPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  return <BillingChannelsListClient />
}
