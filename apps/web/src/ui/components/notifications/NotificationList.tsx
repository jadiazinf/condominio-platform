'use client'

import type { TNotification } from '@packages/domain'

import { Spinner } from '@/ui/components/spinner'
import { Bell } from 'lucide-react'

import { NotificationItem } from './NotificationItem'
import { useTranslation } from '@/contexts'

interface INotificationListProps {
  notifications: TNotification[]
  isLoading?: boolean
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
}

export function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onDelete,
}: INotificationListProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 py-12">
        <Bell size={36} className="text-default-300" />
        <p className="text-small text-default-400">{t('notifications.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
