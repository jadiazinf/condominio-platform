'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from '@heroui/table'
import { Chip } from '@heroui/chip'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { MessageSquare, AlertCircle, Building } from 'lucide-react'

import { useAllSupportTickets } from '@packages/http-client'
import { useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'

export function RecentTicketsTable() {
  const router = useRouter()
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Fetch all tickets with filters for active/unresolved
  const { data, isLoading } = useAllSupportTickets({
    filters: {
      status: 'open',
    },
    enabled: !!token,
  })

  const tickets = data?.data?.slice(0, 5) || []

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      month: 'short',
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
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      waiting_customer: 'Esperando',
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

  const handleViewTicket = (ticket: any) => {
    router.push(`/dashboard/admins/${ticket.managementCompanyId}/tickets/${ticket.id}`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="text-default-400" size={20} />
            <Typography variant="subtitle1">Tickets Recientes</Typography>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-default-400" size={20} />
            <Typography variant="subtitle1">Tickets Activos</Typography>
          </div>
          <span
            className="cursor-pointer"
            onClick={() => router.push('/dashboard/tickets')}
          >
            <Typography className="hover:text-primary" color="primary" variant="body2">
              Ver todos
            </Typography>
          </span>
        </div>
      </CardHeader>
      <CardBody>
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="mb-2 text-default-300" size={40} />
            <Typography color="muted" variant="body2">
              No hay tickets activos
            </Typography>
          </div>
        ) : (
          <Table aria-label="Tabla de tickets recientes" removeWrapper>
            <TableHeader>
              <TableColumn>TICKET</TableColumn>
              <TableColumn>EMPRESA</TableColumn>
              <TableColumn>ASUNTO</TableColumn>
              <TableColumn>PRIORIDAD</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>CREADO</TableColumn>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket: any) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer transition-colors hover:bg-default-100"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertCircle
                        className={
                          ticket.priority === 'urgent' || ticket.priority === 'high'
                            ? 'text-danger'
                            : 'text-default-400'
                        }
                        size={16}
                      />
                      <p className="font-mono text-xs font-medium">
                        {ticket.ticketNumber}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="text-default-400" size={14} />
                      <p className="text-xs text-default-600">
                        {ticket.managementCompany?.legalName || 'N/A'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-xs truncate text-sm font-medium">
                      {ticket.subject}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={getPriorityColor(ticket.priority)}
                      size="sm"
                      variant="flat"
                    >
                      {getPriorityLabel(ticket.priority)}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={getStatusColor(ticket.status)}
                      size="sm"
                      variant="flat"
                    >
                      {getStatusLabel(ticket.status)}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-default-500">
                      {formatDate(ticket.createdAt)}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardBody>
    </Card>
  )
}
