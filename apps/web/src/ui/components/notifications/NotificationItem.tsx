'use client'

import type { TNotification } from '@packages/domain'

import { Button } from '@heroui/button'
import { cn } from '@heroui/theme'
import {
  CreditCard,
  Receipt,
  Megaphone,
  Clock,
  AlertTriangle,
  Settings,
  Check,
  Trash2,
} from 'lucide-react'

import { useTranslation } from '@/contexts'

interface NotificationItemProps {
  notification: TNotification
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
}

const categoryIcons = {
  payment: CreditCard,
  quota: Receipt,
  announcement: Megaphone,
  reminder: Clock,
  alert: AlertTriangle,
  system: Settings,
}

const categoryColors = {
  payment: 'text-success',
  quota: 'text-primary',
  announcement: 'text-secondary',
  reminder: 'text-warning',
  alert: 'text-danger',
  system: 'text-default-500',
}

function formatRelativeTime(date: Date | string, t: (key: string) => string): string {
  const now = new Date()
  const notificationDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return t('notifications.time.justNow')
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return t('notifications.time.minutesAgo').replace('{count}', String(diffInMinutes))
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return t('notifications.time.hoursAgo').replace('{count}', String(diffInHours))
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return t('notifications.time.daysAgo').replace('{count}', String(diffInDays))
  }

  return notificationDate.toLocaleDateString()
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const { t } = useTranslation()
  const Icon = categoryIcons[notification.category] || Settings
  const iconColor = categoryColors[notification.category] || 'text-default-500'

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors',
        notification.isRead ? 'bg-default-50' : 'bg-primary-50/50 dark:bg-primary-900/20'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', iconColor)}>
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium', !notification.isRead && 'text-foreground')}>
            {notification.title}
          </p>
          <span className="text-xs text-default-400 whitespace-nowrap">
            {formatRelativeTime(notification.createdAt, t)}
          </span>
        </div>
        <p className="text-sm text-default-500 line-clamp-2 mt-0.5">{notification.body}</p>

        <div className="flex items-center gap-1 mt-2">
          {!notification.isRead && onMarkAsRead && (
            <Button
              variant="flat"
              className="h-7 text-xs"
              startContent={<Check size={14} />}
              onPress={() => onMarkAsRead(notification.id)}
            >
              {t('notifications.markAsRead')}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="light"
              color="danger"
              className="h-7 text-xs"
              isIconOnly
              onPress={() => onDelete(notification.id)}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {!notification.isRead && (
        <div className="shrink-0 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  )
}
