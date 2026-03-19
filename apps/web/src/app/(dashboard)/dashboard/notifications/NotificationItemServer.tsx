'use client'

import type { TNotification } from '@packages/domain'

import { useRouter } from 'next/navigation'
import { useMarkNotificationAsRead, useDeleteNotification } from '@packages/http-client/hooks'

import { NotificationItem } from '@/ui/components/notifications/NotificationItem'
import { useUser } from '@/contexts'

interface INotificationItemServerProps {
  notification: TNotification
}

export function NotificationItemServer({ notification }: INotificationItemServerProps) {
  const router = useRouter()
  const { user } = useUser()
  const { mutateAsync: markAsRead } = useMarkNotificationAsRead({ userId: user?.id })
  const { mutateAsync: deleteNotification } = useDeleteNotification({ userId: user?.id })

  const handleMarkAsRead = async (id: string) => {
    await markAsRead({ id })
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    await deleteNotification({ id })
    router.refresh()
  }

  return (
    <NotificationItem
      notification={notification}
      onDelete={handleDelete}
      onMarkAsRead={handleMarkAsRead}
    />
  )
}
