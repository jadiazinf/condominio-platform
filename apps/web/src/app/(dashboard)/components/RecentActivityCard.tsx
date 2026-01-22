'use client'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { User, Building2, CreditCard, AlertTriangle } from 'lucide-react'

type ActivityType = 'user' | 'condominium' | 'payment' | 'alert'

interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
}

interface RecentActivityCardProps {
  title: string
  activities: Activity[]
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  user: <User size={16} />,
  condominium: <Building2 size={16} />,
  payment: <CreditCard size={16} />,
  alert: <AlertTriangle size={16} />,
}

const activityColors: Record<ActivityType, 'primary' | 'success' | 'warning' | 'danger'> = {
  user: 'primary',
  condominium: 'success',
  payment: 'warning',
  alert: 'danger',
}

export function RecentActivityCard({ title, activities }: RecentActivityCardProps) {
  return (
    <Card className="border border-divider">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardBody className="gap-3 pt-0">
        {activities.length === 0 ? (
          <p className="text-default-500 text-sm py-4 text-center">No hay actividad reciente</p>
        ) : (
          activities.map(activity => (
            <div
              key={activity.id}
              className="flex items-start gap-3 py-2 border-b border-divider last:border-b-0"
            >
              <Chip
                classNames={{
                  base: 'min-w-8 h-8',
                  content: 'flex items-center justify-center p-0',
                }}
                color={activityColors[activity.type]}
                size="sm"
                variant="flat"
              >
                {activityIcons[activity.type]}
              </Chip>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-default-500 truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-default-400 whitespace-nowrap">
                {activity.timestamp}
              </span>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  )
}
