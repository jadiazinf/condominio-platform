import { fetchUserFcmTokens } from '@packages/http-client'

import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'

import { PushNotificationToggle } from './components/PushNotificationToggle'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function NotificationsSettingsPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const activeTokens = session.sessionToken
    ? await fetchUserFcmTokens(session.sessionToken, session.user.id).catch(() => [])
    : []

  const hasActiveTokens = activeTokens.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        description={t('settings.notifications.subtitle')}
        title={t('settings.notifications.title')}
      />

      <Section
        description={t('settings.notifications.pushDescription')}
        title={t('settings.notifications.pushTitle')}
      >
        <PushNotificationToggle initialHasActiveTokens={hasActiveTokens} />
      </Section>
    </div>
  )
}
