import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'
import { NotificationsPageClient } from './NotificationsPageClient'

export default async function NotificationsPage() {
  const { t } = await getTranslations()

  const translations = {
    title: t('notifications.page.title'),
    subtitle: t('notifications.page.subtitle'),
    filters: {
      category: t('notifications.page.filters.category'),
      readStatus: t('notifications.page.filters.readStatus'),
      all: t('notifications.page.filters.all'),
      read: t('notifications.page.filters.read'),
      unread: t('notifications.page.filters.unread'),
    },
    categories: {
      payment: t('notifications.categories.payment'),
      quota: t('notifications.categories.quota'),
      announcement: t('notifications.categories.announcement'),
      reminder: t('notifications.categories.reminder'),
      alert: t('notifications.categories.alert'),
      system: t('notifications.categories.system'),
    },
    markAllAsRead: t('notifications.page.markAllAsRead'),
    noNotifications: t('notifications.page.noNotifications'),
    noNotificationsDescription: t('notifications.page.noNotificationsDescription'),
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{translations.title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {translations.subtitle}
        </Typography>
      </div>

      <NotificationsPageClient translations={translations} />
    </div>
  )
}
