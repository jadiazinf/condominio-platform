'use client'

import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { useMarkAllNotificationsAsRead } from '@packages/http-client/hooks'

import { Button } from '@/ui/components/button'
import { useUser } from '@/contexts'

interface INotificationsActionsProps {
  translations: {
    markAllAsRead: string
  }
}

export function NotificationsActions({ translations }: INotificationsActionsProps) {
  const router = useRouter()
  const { user } = useUser()
  const { mutateAsync: markAllAsRead } = useMarkAllNotificationsAsRead({ userId: user?.id })

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    router.refresh()
  }

  return (
    <Button
      color="success"
      size="sm"
      startContent={<CheckCheck size={16} />}
      variant="light"
      onPress={handleMarkAllAsRead}
    >
      {translations.markAllAsRead}
    </Button>
  )
}
