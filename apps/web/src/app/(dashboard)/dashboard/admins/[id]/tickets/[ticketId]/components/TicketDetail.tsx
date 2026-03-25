'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  useSupportTicket,
  useUpdateTicketStatus,
  useResolveTicket,
  useCloseTicket,
} from '@packages/http-client'

import { TicketMessages } from './TicketMessages'

import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Divider } from '@/ui/components/divider'
import { getTicketStatusColor, getTicketPriorityColor } from '@/utils/status-colors'
import { useAuth } from '@/contexts'
import { useUser } from '@/stores/session-store'
import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'

interface TicketDetailProps {
  companyId: string
  ticketId: string
}

export function TicketDetail({ companyId, ticketId }: TicketDetailProps) {
  const router = useRouter()
  const { user: firebaseUser } = useAuth()
  const { user } = useUser()
  const toast = useToast()
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

  const updateStatusMutation = useUpdateTicketStatus(ticketId, companyId)
  const resolveMutation = useResolveTicket(ticketId, companyId)
  const closeMutation = useCloseTicket(ticketId, companyId)

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  const isTerminal =
    ticket?.status === 'closed' || ticket?.status === 'cancelled' || ticket?.status === 'resolved'

  const handleResolve = () => {
    if (!user) return
    toast.promise(
      resolveMutation.mutateAsync({ resolvedBy: user.id }).then(() => router.refresh()),
      { loading: 'Resolviendo...', success: 'Ticket resuelto', error: 'Error al resolver' }
    )
  }

  const handleClose = () => {
    if (!user) return
    toast.promise(
      closeMutation.mutateAsync({ closedBy: user.id, solution: '' }).then(() => router.refresh()),
      { loading: 'Cerrando...', success: 'Ticket cerrado', error: 'Error al cerrar' }
    )
  }

  const handleCancel = () => {
    toast.promise(
      updateStatusMutation.mutateAsync({ status: 'cancelled' }).then(() => router.refresh()),
      { loading: 'Cancelando...', success: 'Ticket cancelado', error: 'Error al cancelar' }
    )
  }

  const handleStatusChange = (status: string) => {
    toast.promise(
      updateStatusMutation.mutateAsync({ status: status as any }).then(() => router.refresh()),
      { loading: 'Actualizando...', success: 'Estado actualizado', error: 'Error al actualizar' }
    )
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
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

  const createdByUser = ticket.createdByUser
  const assignedUser = ticket.currentAssignment?.assignedToUser

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          isIconOnly
          className="mt-0.5 shrink-0"
          href={`/dashboard/admins/${companyId}/tickets`}
          size="sm"
          variant="flat"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="min-w-0">
          <Typography className="break-words" variant="h3">
            {ticket.subject}
          </Typography>
          <Typography color="muted" variant="body2">
            Ticket #{ticket.ticketNumber}
          </Typography>
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {/* Details sidebar — on mobile show first */}
        <div className="order-1 lg:order-2">
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Detalles</Typography>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              {/* Status */}
              <div>
                <Typography color="muted" variant="caption">
                  Estado
                </Typography>
                <div className="mt-1">
                  <Chip color={getTicketStatusColor(ticket.status)} variant="flat">
                    {getStatusLabel(ticket.status)}
                  </Chip>
                </div>
              </div>

              {/* Priority */}
              <div>
                <Typography color="muted" variant="caption">
                  Prioridad
                </Typography>
                <div className="mt-1">
                  <Chip color={getTicketPriorityColor(ticket.priority)} variant="flat">
                    {getPriorityLabel(ticket.priority)}
                  </Chip>
                </div>
              </div>

              {/* Category */}
              <div>
                <Typography color="muted" variant="caption">
                  Categoría
                </Typography>
                <Typography className="mt-1" variant="body2">
                  {getCategoryLabel(ticket.category)}
                </Typography>
              </div>

              <Divider />

              {/* Dates */}
              <div>
                <Typography color="muted" variant="caption">
                  Creado
                </Typography>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="shrink-0 text-default-400" size={16} />
                  <Typography variant="body2">{formatDate(ticket.createdAt)}</Typography>
                </div>
              </div>

              {ticket.resolvedAt && (
                <div>
                  <Typography color="muted" variant="caption">
                    Resuelto
                  </Typography>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle2 className="shrink-0 text-success" size={16} />
                    <Typography variant="body2">{formatDate(ticket.resolvedAt)}</Typography>
                  </div>
                </div>
              )}

              {ticket.closedAt && (
                <div>
                  <Typography color="muted" variant="caption">
                    Cerrado
                  </Typography>
                  <div className="mt-1 flex items-center gap-2">
                    <XCircle className="shrink-0 text-default-400" size={16} />
                    <Typography variant="body2">{formatDate(ticket.closedAt)}</Typography>
                  </div>
                </div>
              )}

              {/* Created by */}
              {createdByUser && (
                <>
                  <Divider />
                  <div>
                    <Typography color="muted" variant="caption">
                      Creado por
                    </Typography>
                    <div className="mt-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="shrink-0 text-default-400" size={16} />
                        <Typography variant="body2">
                          {createdByUser.firstName && createdByUser.lastName
                            ? `${createdByUser.firstName} ${createdByUser.lastName}`
                            : createdByUser.displayName || createdByUser.email}
                        </Typography>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="shrink-0 text-default-400" size={16} />
                        <Typography variant="body2">{createdByUser.email}</Typography>
                      </div>
                      {createdByUser.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="shrink-0 text-default-400" size={16} />
                          <Typography variant="body2">
                            {createdByUser.phoneCountryCode
                              ? `${createdByUser.phoneCountryCode} ${createdByUser.phoneNumber}`
                              : createdByUser.phoneNumber}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Assigned to */}
              <div>
                <Typography color="muted" variant="caption">
                  Asignado a
                </Typography>
                <div className="mt-1 flex items-center gap-2">
                  <User className="shrink-0 text-default-400" size={16} />
                  <Typography variant="body2">
                    {assignedUser
                      ? assignedUser.displayName || assignedUser.email
                      : 'No se ha asignado a un usuario'}
                  </Typography>
                </div>
              </div>

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <>
                  <Divider />
                  <div>
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
                </>
              )}

              {/* Action buttons */}
              {!isTerminal && (
                <>
                  <Divider />
                  <div className="flex flex-col gap-3">
                    {/* Status change buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <Button
                        className="flex-1"
                        color="warning"
                        isLoading={updateStatusMutation.isPending}
                        size="lg"
                        variant="flat"
                        onPress={() => handleStatusChange('in_progress')}
                      >
                        En progreso
                      </Button>
                      <Button
                        className="flex-1"
                        color="secondary"
                        isLoading={updateStatusMutation.isPending}
                        size="lg"
                        variant="flat"
                        onPress={() => handleStatusChange('waiting_customer')}
                      >
                        Esperando respuesta
                      </Button>
                    </div>
                    {/* Resolve and Close */}
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      {!ticket.resolvedAt && (
                        <Button
                          className="flex-1"
                          color="success"
                          isLoading={resolveMutation.isPending}
                          size="lg"
                          variant="flat"
                          onPress={handleResolve}
                        >
                          Resolver
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        color="danger"
                        isLoading={closeMutation.isPending}
                        size="lg"
                        variant="flat"
                        onPress={handleClose}
                      >
                        Cerrar
                      </Button>
                    </div>
                    {/* Cancel */}
                    <Button
                      className="w-full"
                      color="danger"
                      isLoading={updateStatusMutation.isPending}
                      size="lg"
                      variant="bordered"
                      onPress={handleCancel}
                    >
                      Cancelar ticket
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Main content — on mobile show after sidebar */}
        <div className="order-2 flex flex-col gap-6 lg:order-1 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Descripción</Typography>
            </CardHeader>
            <Divider />
            <CardBody>
              <Typography variant="body1">{ticket.description}</Typography>
            </CardBody>
          </Card>

          {/* Messages */}
          <TicketMessages ticketId={ticketId} ticketStatus={ticket.status} />
        </div>
      </div>
    </div>
  )
}
