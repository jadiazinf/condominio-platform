'use client'

import type { CardProps } from '@heroui/card'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Avatar } from '@heroui/avatar'
import { cn } from '@heroui/theme'

type TActivityType = 'user' | 'payment' | 'condominium' | 'alert' | 'system'

type TActivity = {
  id: string
  type: TActivityType
  title: string
  description: string
  timestamp: string
  avatar?: string
  avatarColor?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'default'
}

interface ActivityFeedProps extends Omit<CardProps, 'children'> {
  title: string
  activities: TActivity[]
  emptyMessage?: string
}

const activityAvatarColors: Record<TActivityType, 'primary' | 'success' | 'warning' | 'danger' | 'secondary'> = {
  user: 'primary',
  payment: 'success',
  condominium: 'secondary',
  alert: 'danger',
  system: 'warning',
}

const activityIcons: Record<TActivityType, string> = {
  user: '👤',
  payment: '💳',
  condominium: '🏢',
  alert: '⚠️',
  system: '⚙️',
}

export function ActivityFeed({
  title,
  activities,
  emptyMessage = 'No hay actividad reciente',
  className,
  ...props
}: ActivityFeedProps) {
  return (
    <Card className={cn('border border-divider', className)} {...props}>
      <CardHeader className="px-4 pt-4 pb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardBody className="gap-1 px-4 pb-4 pt-0">
        {activities.length === 0 ? (
          <p className="text-default-500 text-sm py-8 text-center">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar
                  classNames={{
                    base: cn(
                      'flex-shrink-0',
                      `bg-${activityAvatarColors[activity.type]}-100`,
                      `text-${activityAvatarColors[activity.type]}`
                    ),
                  }}
                  name={activity.avatar || activityIcons[activity.type]}
                  showFallback
                  size="sm"
                  src={activity.avatar}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-default-500 truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-default-400 whitespace-nowrap flex-shrink-0">
                      {activity.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export type { TActivity, TActivityType }
