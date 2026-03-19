import { fetchNotificationsPaginated } from '@packages/http-client'

import { NotificationsActions } from './NotificationsActions'
import { NotificationItemServer } from './NotificationItemServer'
import { NotificationsFilters } from './NotificationsFilters'
import { NotificationsPagination } from './NotificationsPagination'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session/getFullSession'
import { Typography } from '@/ui/components/typography'

interface INotificationsPageProps {
  searchParams: Promise<{
    category?: string
    read?: string
    page?: string
    limit?: string
  }>
}

export default async function NotificationsPage({ searchParams }: INotificationsPageProps) {
  const params = await searchParams
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const category = params.category || undefined
  const readFilter = params.read || 'unread'
  const page = Math.max(1, Number(params.page || '1'))
  const limit = Math.min(100, Math.max(1, Number(params.limit || '20')))

  const isRead = readFilter === 'all' ? undefined : readFilter === 'read'

  const result = await fetchNotificationsPaginated({
    token: session.sessionToken,
    page,
    limit,
    category,
    isRead,
  })

  const notifications = result.data ?? []
  const pagination = result.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

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
        <Typography className="mt-1" color="muted" variant="body2">
          {translations.subtitle}
        </Typography>
      </div>

      {/* Filters + Mark all as read */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <NotificationsFilters
          category={category || 'all'}
          readFilter={readFilter}
          translations={translations}
        />
        <div className="sm:ml-auto">
          <NotificationsActions translations={translations} />
        </div>
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-default-300 py-16">
          <svg
            className="text-default-300"
            fill="none"
            height="48"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="48"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <p className="text-default-400">{translations.noNotifications}</p>
          <p className="text-small text-default-300">{translations.noNotificationsDescription}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-default-200">
            {notifications.map(notification => (
              <NotificationItemServer key={notification.id} notification={notification} />
            ))}
          </div>

          <NotificationsPagination
            limit={pagination.limit}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
          />
        </>
      )}
    </div>
  )
}
