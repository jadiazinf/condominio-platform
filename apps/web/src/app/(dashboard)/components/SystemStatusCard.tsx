'use client'

import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

type ServiceStatus = 'operational' | 'degraded' | 'down'

interface Service {
  name: string
  status: ServiceStatus
  latency?: number
}

interface SystemStatusCardProps {
  title: string
  services: Service[]
}

const statusConfig: Record<
  ServiceStatus,
  { icon: React.ReactNode; color: 'success' | 'warning' | 'danger'; label: string }
> = {
  operational: {
    icon: <CheckCircle size={14} />,
    color: 'success',
    label: 'Operativo',
  },
  degraded: {
    icon: <AlertCircle size={14} />,
    color: 'warning',
    label: 'Degradado',
  },
  down: {
    icon: <XCircle size={14} />,
    color: 'danger',
    label: 'Caído',
  },
}

export function SystemStatusCard({ title, services }: SystemStatusCardProps) {
  const allOperational = services.every(s => s.status === 'operational')

  return (
    <Card className="border border-divider">
      <CardHeader className="pb-2 flex-row justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Chip
          color={allOperational ? 'success' : 'warning'}
          startContent={allOperational ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          variant="flat"
        >
          {allOperational ? 'Todo operativo' : 'Revisar servicios'}
        </Chip>
      </CardHeader>
      <CardBody className="gap-2 pt-0">
        {services.map(service => {
          const config = statusConfig[service.status]

          return (
            <div
              key={service.name}
              className="flex items-center justify-between py-2 border-b border-divider last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className={`text-${config.color}`}>{config.icon}</span>
                <span className="text-sm">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {service.latency !== undefined && (
                  <span className="text-xs text-default-400">{service.latency}ms</span>
                )}
                <Chip color={config.color} variant="flat">
                  {config.label}
                </Chip>
              </div>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}
