'use client'

import { Popover, PopoverTrigger, PopoverContent } from '@/ui/components/popover'
import { Button } from '@/ui/components/button'
import { Divider } from '@/ui/components/divider'
import { Link } from '@/ui/components/link'
import { Bell, CheckCheck } from 'lucide-react'

import { NotificationList } from './NotificationList'
import { IconBadge } from '@/ui/components/badge'
import { useNotifications } from '@/hooks'
import { useTranslation } from '@/contexts'

interface NotificationPanelProps {
  maxNotifications?: number
}

export function NotificationPanel({ maxNotifications = 5 }: NotificationPanelProps) {
  const { t } = useTranslation()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()

  const displayNotifications = notifications.slice(0, maxNotifications)
  const hasUnread = unreadCount > 0

  return (
    <Popover placement="bottom-end" offset={10}>
      <PopoverTrigger>
        <IconBadge
          icon={<Bell size={20} />}
          badgeContent={unreadCount}
          showBadge={hasUnread}
          aria-label={t('notifications.title')}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex flex-col">
          <div className="px-4 py-3">
            <h3 className="font-semibold text-center">{t('notifications.title')}</h3>
          </div>
          <Divider />
          {hasUnread && (
            <>
              <div className="flex justify-end px-3 py-2">
                <Button
                  variant="light"
                  className="h-7 text-xs"
                  startContent={<CheckCheck size={14} />}
                  onPress={() => markAllAsRead()}
                >
                  {t('notifications.markAllAsRead')}
                </Button>
              </div>
              <Divider />
            </>
          )}
          <div className="max-h-80 overflow-y-auto p-2">
            <NotificationList
              notifications={displayNotifications}
              isLoading={isLoading}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          </div>
          <Divider />
          <div className="p-3 text-center">
            <Link href="/dashboard/notifications" className="text-xs font-medium">
              {t('notifications.viewAll')}
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
