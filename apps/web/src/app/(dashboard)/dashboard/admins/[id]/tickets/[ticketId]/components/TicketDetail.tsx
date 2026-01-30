'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Divider } from '@/ui/components/divider'
import {
  ArrowLeft,
  Calendar,
  Tag,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

import { useSupportTicket } from '@packages/http-client'
import { useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'

import { TicketMessages } from './TicketMessages'

interface TicketDetailProps {
  companyId: string
  ticketId: string
}

export function TicketDetail({ companyId, ticketId }: TicketDetailProps) {
  const router = useRouter()
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading } = useSupportTicket(ticketId, {
    enabled: !!token && !!ticketId,
  })

  const ticket = data?.data

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'primary'
      case 'in_progress':
        return 'secondary'
      case 'waiting_customer':
        return 'warning'
      case 'resolved':
        return 'success'
      case 'closed':
        return 'default'
      case 'cancelled':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      waiting_customer: 'Esperando Cliente',
      resolved: 'Resuelto',
      closed: 'Cerrado',
      cancelled: 'Cancelado',
    }
    return labels[status.toLowerCase()] || status
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'primary'
      case 'low':
        return 'default'
      default:
        return 'default'
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      urgent: 'Urgente',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    }
    return labels[priority.toLowerCase()] || priority
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return 'General'
    const labels: Record<string, string> = {
      technical: 'Técnico',
      billing: 'Facturación',
      feature_request: 'Solicitud',
      general: 'General',
      bug: 'Error',
    }
    return labels[category.toLowerCase()] || category
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="mb-4 text-default-400" size={48} />
        <Typography variant="h3">Ticket no encontrado</Typography>
        <Button
          className="mt-4"
          color="primary"
          startContent={<ArrowLeft size={16} />}
          variant="flat"
          onPress={() => router.push(`/dashboard/admins/${companyId}/tickets`)}
        >
          Volver a la lista
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          isIconOnly
          variant="light"
          onPress={() => router.push(`/dashboard/admins/${companyId}/tickets`)}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <Typography variant="h3">{ticket.ticketNumber}</Typography>
          <Typography color="muted" variant="body2">
            Ticket de soporte
          </Typography>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader className="flex-col items-start gap-2">
              <div className="flex w-full items-start justify-between gap-4">
                <div className="flex-1">
                  <Typography variant="h4">{ticket.subject}</Typography>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip color={getStatusColor(ticket.status)} variant="flat">
                      {getStatusLabel(ticket.status)}
                    </Chip>
                    <Chip color={getPriorityColor(ticket.priority)} variant="flat">
                      {getPriorityLabel(ticket.priority)}
                    </Chip>
                    {ticket.category && (
                      <Chip color="default" variant="bordered">
                        {getCategoryLabel(ticket.category)}
                      </Chip>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Typography color="muted" variant="caption">
                  Descripción
                </Typography>
                <Typography className="mt-1" variant="body1">
                  {ticket.description}
                </Typography>
              </div>

              <Divider />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="text-default-400" size={18} />
                  <div>
                    <Typography color="muted" variant="caption">
                      Creado
                    </Typography>
                    <Typography variant="body2">{formatDate(ticket.createdAt)}</Typography>
                  </div>
                </div>

                {ticket.updatedAt && (
                  <div className="flex items-center gap-3">
                    <Clock className="text-default-400" size={18} />
                    <div>
                      <Typography color="muted" variant="caption">
                        Última actualización
                      </Typography>
                      <Typography variant="body2">{formatDate(ticket.updatedAt)}</Typography>
                    </div>
                  </div>
                )}

                {ticket.resolvedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-success" size={18} />
                    <div>
                      <Typography color="muted" variant="caption">
                        Resuelto
                      </Typography>
                      <Typography variant="body2">{formatDate(ticket.resolvedAt)}</Typography>
                    </div>
                  </div>
                )}

                {ticket.closedAt && (
                  <div className="flex items-center gap-3">
                    <XCircle className="text-default-400" size={18} />
                    <div>
                      <Typography color="muted" variant="caption">
                        Cerrado
                      </Typography>
                      <Typography variant="body2">{formatDate(ticket.closedAt)}</Typography>
                    </div>
                  </div>
                )}
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <>
                  <Divider />
                  <div className="flex items-start gap-3">
                    <Tag className="text-default-400" size={18} />
                    <div className="flex-1">
                      <Typography color="muted" variant="caption">
                        Etiquetas
                      </Typography>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {ticket.tags.map(tag => (
                          <Chip key={tag} variant="flat">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Messages */}
          <TicketMessages ticketId={ticketId} ticketStatus={ticket.status} />
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Acciones</Typography>
            </CardHeader>
            <CardBody className="space-y-2">
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <>
                  <Button className="w-full" color="success" variant="flat">
                    Marcar como Resuelto
                  </Button>
                  <Button className="w-full" color="primary" variant="flat">
                    Cambiar Estado
                  </Button>
                </>
              )}
              {ticket.status === 'resolved' && (
                <Button className="w-full" color="default" variant="flat">
                  Cerrar Ticket
                </Button>
              )}
              <Button className="w-full" color="danger" variant="light">
                Cancelar Ticket
              </Button>
            </CardBody>
          </Card>

          {ticket.currentAssignment?.assignedToUser && (
            <Card>
              <CardHeader>
                <Typography variant="subtitle1">Asignado a</Typography>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-3">
                  <User className="text-default-400" size={18} />
                  <Typography variant="body2">
                    {ticket.currentAssignment.assignedToUser.displayName || ticket.currentAssignment.assignedToUser.email}
                  </Typography>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
