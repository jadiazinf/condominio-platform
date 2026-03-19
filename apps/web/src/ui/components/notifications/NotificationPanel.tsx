'use client'

import { useMemo } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@heroui/popover'
import { Badge } from '@heroui/badge'
import { Button as HeroUIButton } from '@heroui/button'
import { ScrollShadow } from '@heroui/scroll-shadow'
import { Bell, CheckCheck } from 'lucide-react'

import { NotificationList } from './NotificationList'

import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'
import { useNotifications } from '@/hooks'
import { useTranslation } from '@/contexts'

interface INotificationPanelProps {
  maxNotifications?: number
}

export function NotificationPanel({ maxNotifications = 10 }: INotificationPanelProps) {
  const { t } = useTranslation()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.isRead).slice(0, maxNotifications),
    [notifications, maxNotifications]
  )

  const hasUnread = unreadCount > 0

  return (
    <Popover offset={10} placement="bottom-end" radius="sm">
      <PopoverTrigger>
        <HeroUIButton
          isIconOnly
          aria-label={t('notifications.title')}
          className="overflow-visible"
          size="sm"
          variant="light"
        >
          <Badge
            classNames={{ badge: 'border-0' }}
            color="success"
            content={unreadCount}
            isInvisible={!hasUnread}
            size="sm"
          >
            <Bell size={20} />
          </Badge>
        </HeroUIButton>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <div className="flex h-[460px] flex-col">
          {/* Header */}
          <div className="flex w-full shrink-0 items-center justify-between border-b border-divider px-4 py-3">
            <h4 className="text-large font-medium">{t('notifications.title')}</h4>
            {hasUnread && (
              <Button
                className="h-7 text-xs"
                color="success"
                size="sm"
                startContent={<CheckCheck size={14} />}
                variant="light"
                onPress={() => markAllAsRead()}
              >
                {t('notifications.markAllAsRead')}
              </Button>
            )}
          </div>

          {/* Notification list — only unread */}
          <ScrollShadow className="min-h-0 flex-1">
            <NotificationList
              isLoading={isLoading}
              notifications={unreadNotifications}
              onDelete={deleteNotification}
              onMarkAsRead={markAsRead}
            />
          </ScrollShadow>

          {/* Footer */}
          <div className="shrink-0 border-t border-divider px-4 py-2 text-center">
            <Link className="text-sm text-primary hover:underline" href="/dashboard/notifications">
              {t('notifications.viewAll')}
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
