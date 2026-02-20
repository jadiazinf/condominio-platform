'use client'

import { useMemo, useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@heroui/popover'
import { Badge } from '@heroui/badge'
import { Button as HeroUIButton } from '@heroui/button'
import { Tabs, Tab } from '@heroui/tabs'
import { ScrollShadow } from '@heroui/scroll-shadow'
import { Bell, CheckCheck } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Link } from '@/ui/components/link'
import { NotificationList } from './NotificationList'
import { useNotifications } from '@/hooks'
import { useTranslation } from '@/contexts'

enum ENotificationTab {
  All = 'all',
  Unread = 'unread',
}

interface INotificationPanelProps {
  maxNotifications?: number
}

export function NotificationPanel({ maxNotifications = 10 }: INotificationPanelProps) {
  const { t } = useTranslation()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()

  const [activeTab, setActiveTab] = useState<ENotificationTab>(ENotificationTab.All)

  const filteredNotifications = useMemo(() => {
    const list =
      activeTab === ENotificationTab.Unread ? notifications.filter(n => !n.isRead) : notifications
    return list.slice(0, maxNotifications)
  }, [notifications, activeTab, maxNotifications])

  const hasUnread = unreadCount > 0

  return (
    <Popover placement="bottom-end" offset={10} radius="sm">
      <PopoverTrigger>
        <HeroUIButton
          isIconOnly
          size="sm"
          variant="light"
          className="overflow-visible"
          aria-label={t('notifications.title')}
        >
          <Badge
            content={unreadCount}
            color="success"
            size="sm"
            isInvisible={!hasUnread}
            classNames={{ badge: 'border-0' }}
          >
            <Bell size={20} />
          </Badge>
        </HeroUIButton>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex w-full items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h4 className="text-large font-medium">{t('notifications.title')}</h4>
              {hasUnread && (
                <Chip size="sm" variant="flat">
                  {unreadCount}
                </Chip>
              )}
            </div>
            {hasUnread && (
              <Button
                size="sm"
                variant="light"
                color="success"
                className="h-7 text-xs"
                startContent={<CheckCheck size={14} />}
                onPress={() => markAllAsRead()}
              >
                {t('notifications.markAllAsRead')}
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            aria-label={t('notifications.title')}
            classNames={{
              base: 'w-full',
              tabList: 'gap-4 px-4 py-0 w-full relative rounded-none border-b border-divider',
              cursor: 'w-full',
              tab: 'max-w-fit px-2 h-10',
            }}
            color="success"
            selectedKey={activeTab}
            variant="underlined"
            onSelectionChange={key => setActiveTab(key as ENotificationTab)}
          >
            <Tab
              key={ENotificationTab.All}
              title={
                <div className="flex items-center gap-1.5">
                  <span>{t('notifications.tabs.all')}</span>
                  <Chip size="sm" variant="flat">
                    {notifications.length}
                  </Chip>
                </div>
              }
            />
            <Tab
              key={ENotificationTab.Unread}
              title={
                <div className="flex items-center gap-1.5">
                  <span>{t('notifications.tabs.unread')}</span>
                  {hasUnread && (
                    <Chip size="sm" variant="flat">
                      {unreadCount}
                    </Chip>
                  )}
                </div>
              }
            />
          </Tabs>

          {/* Notification list */}
          <ScrollShadow className="h-[350px] max-h-[350px] w-full">
            <NotificationList
              notifications={filteredNotifications}
              isLoading={isLoading}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          </ScrollShadow>

          {/* Footer */}
          <div className="border-t border-divider px-4 py-2 text-center">
            <Link href="/dashboard/notifications" className="text-sm text-primary hover:underline">
              {t('notifications.viewAll')}
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
