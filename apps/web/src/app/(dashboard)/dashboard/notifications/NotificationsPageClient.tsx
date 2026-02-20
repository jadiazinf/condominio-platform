'use client'

import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { NotificationItem } from '@/ui/components/notifications/NotificationItem'
import { useUser } from '@/contexts'
import {
  useMyNotificationsPaginated,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@packages/http-client/hooks'

type TCategoryFilter = 'all' | 'payment' | 'quota' | 'announcement' | 'reminder' | 'alert' | 'system'
type TReadFilter = 'all' | 'read' | 'unread'

interface INotificationsPageClientProps {
  translations: {
    filters: {
      category: string
      readStatus: string
      all: string
      read: string
      unread: string
    }
    categories: {
      payment: string
      quota: string
      announcement: string
      reminder: string
      alert: string
      system: string
    }
    markAllAsRead: string
    noNotifications: string
    noNotificationsDescription: string
  }
}

export function NotificationsPageClient({ translations }: INotificationsPageClientProps) {
  const { user } = useUser()
  const userId = user?.id

  const [categoryFilter, setCategoryFilter] = useState<TCategoryFilter>('all')
  const [readFilter, setReadFilter] = useState<TReadFilter>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const { data: response, isLoading } = useMyNotificationsPaginated({
    page,
    limit,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    isRead: readFilter === 'all' ? undefined : readFilter === 'read',
    enabled: !!userId,
  })

  const notifications = response?.data ?? []
  const pagination = response?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  const { mutateAsync: markAsReadMutation } = useMarkNotificationAsRead({ userId })
  const { mutateAsync: markAllAsReadMutation } = useMarkAllNotificationsAsRead({ userId })
  const { mutateAsync: deleteNotificationMutation } = useDeleteNotification({ userId })

  const categoryItems: ISelectItem[] = [
    { key: 'all', label: translations.filters.all },
    { key: 'payment', label: translations.categories.payment },
    { key: 'quota', label: translations.categories.quota },
    { key: 'announcement', label: translations.categories.announcement },
    { key: 'reminder', label: translations.categories.reminder },
    { key: 'alert', label: translations.categories.alert },
    { key: 'system', label: translations.categories.system },
  ]

  const readItems: ISelectItem[] = [
    { key: 'all', label: translations.filters.all },
    { key: 'read', label: translations.filters.read },
    { key: 'unread', label: translations.filters.unread },
  ]

  const handleCategoryChange = (key: string | null) => {
    setCategoryFilter((key ?? 'all') as TCategoryFilter)
    setPage(1)
  }

  const handleReadChange = (key: string | null) => {
    setReadFilter((key ?? 'all') as TReadFilter)
    setPage(1)
  }

  const handleMarkAsRead = async (id: string) => {
    await markAsReadMutation({ id })
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation()
  }

  const handleDelete = async (id: string) => {
    await deleteNotificationMutation({ id })
  }

  return (
    <>
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select
          aria-label={translations.filters.category}
          items={categoryItems}
          value={categoryFilter}
          onChange={handleCategoryChange}
          className="sm:max-w-[200px]"
        />
        <Select
          aria-label={translations.filters.readStatus}
          items={readItems}
          value={readFilter}
          onChange={handleReadChange}
          className="sm:max-w-[200px]"
        />
        <div className="sm:ml-auto">
          <Button
            size="sm"
            variant="light"
            color="success"
            startContent={<CheckCheck size={16} />}
            onPress={handleMarkAllAsRead}
          >
            {translations.markAllAsRead}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-default-300 py-16">
          <Bell size={48} className="text-default-300" />
          <p className="text-default-400">{translations.noNotifications}</p>
          <p className="text-small text-default-300">{translations.noNotificationsDescription}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-default-200">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit)
              setPage(1)
            }}
          />
        </>
      )}
    </>
  )
}
