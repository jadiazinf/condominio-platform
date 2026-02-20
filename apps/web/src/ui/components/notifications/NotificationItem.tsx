'use client'

import type { TNotification } from '@packages/domain'
import { cn } from '@heroui/theme'
import {
  CreditCard,
  Receipt,
  Megaphone,
  Clock,
  AlertTriangle,
  Settings,
  Trash2,
} from 'lucide-react'

import { Button } from '@/ui/components/button'
import { useTranslation } from '@/contexts'

interface INotificationItemProps {
  notification: TNotification
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
}

const CATEGORY_ICONS = {
  payment: CreditCard,
  quota: Receipt,
  announcement: Megaphone,
  reminder: Clock,
  alert: AlertTriangle,
  system: Settings,
} as const

const CATEGORY_COLORS = {
  payment: 'bg-success/10 text-success',
  quota: 'bg-primary/10 text-primary',
  announcement: 'bg-secondary/10 text-secondary',
  reminder: 'bg-warning/10 text-warning',
  alert: 'bg-danger/10 text-danger',
  system: 'bg-default-100 text-default-500',
} as const

function formatRelativeTime(date: Date | string, t: (key: string) => string): string {
  const now = new Date()
  const notificationDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000)

  if (diffInSeconds < 60) return t('notifications.time.justNow')

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

/**
 * Resolves the display title/body from i18n data if available, otherwise falls back to raw text.
 */
function resolveI18nText(
  notification: TNotification,
  t: (key: string) => string
): { title: string; body: string } {
  const i18n = (notification.data as Record<string, unknown> | null)?.i18n as
    | { titleKey?: string; bodyKey?: string; params?: Record<string, string> }
    | undefined

  if (!i18n) {
    return { title: notification.title, body: notification.body }
  }

  let title = i18n.titleKey ? t(i18n.titleKey) : notification.title
  let body = i18n.bodyKey ? t(i18n.bodyKey) : notification.body

  // Replace {param} placeholders with actual values
  if (i18n.params) {
    for (const [key, value] of Object.entries(i18n.params)) {
      title = title.replace(`{${key}}`, value)
      body = body.replace(`{${key}}`, value)
    }
  }

  return { title, body }
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: INotificationItemProps) {
  const { t } = useTranslation()
  const Icon = CATEGORY_ICONS[notification.category] ?? Settings
  const colorClass = CATEGORY_COLORS[notification.category] ?? CATEGORY_COLORS.system
  const { title, body } = resolveI18nText(notification, t)

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <div
      className={cn(
        'flex gap-3 border-b border-divider px-4 py-3 cursor-pointer transition-colors hover:bg-default-100/50',
        !notification.isRead && 'bg-success-50/50'
      )}
      onClick={handleClick}
    >
      <div className="relative flex-none">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-full', colorClass)}>
          <Icon size={18} />
        </div>
        {!notification.isRead && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
        )}
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="text-small text-foreground">
          <strong className="font-medium">{title}</strong>{' '}
          {body}
        </p>
        <time className="text-tiny text-default-400">
          {formatRelativeTime(notification.createdAt, t)}
        </time>
      </div>

      {onDelete && (
        <div className="flex-none self-center">
          <Button
            isIconOnly
            variant="light"
            color="danger"
            size="sm"
            className="h-7 w-7 min-w-0"
            onPress={() => onDelete(notification.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
