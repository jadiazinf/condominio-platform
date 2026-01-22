'use client'

import type { TNotification } from '@packages/domain'

import { Spinner } from '@heroui/spinner'
import { Bell } from 'lucide-react'

import { NotificationItem } from './NotificationItem'
import { useTranslation } from '@/contexts'

interface NotificationListProps {
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
}: NotificationListProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-default-400">
        <Bell size={32} className="mb-2" />
        <p className="text-sm">{t('notifications.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
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
