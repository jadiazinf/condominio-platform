'use client'

import type { TTicketChannel, TTicketStatus } from '@packages/domain'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, MessageSquare, ChevronRight, Circle } from 'lucide-react'
import { useMyTickets } from '@packages/http-client'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'

// ─────────────────────────────────────────────────────────────────────────────
// Filter options
// ─────────────────────────────────────────────────────────────────────────────

const channelItems: ISelectItem[] = [
  { key: 'all', label: 'Todos' },
  { key: 'resident_to_admin', label: 'Administradora' },
  { key: 'resident_to_support', label: 'Soporte' },
]

const statusItems: ISelectItem[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abierto' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'waiting_customer', label: 'Esperando respuesta' },
  { key: 'resolved', label: 'Resuelto' },
  { key: 'closed', label: 'Cerrado' },
  { key: 'cancelled', label: 'Cancelado' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getChannelLabel(channel: string): string {
  switch (channel) {
    case 'resident_to_admin':
      return 'Administradora'
    case 'resident_to_support':
    case 'admin_to_support':
      return 'Soporte'
    default:
      return channel
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Abierto'
    case 'in_progress':
      return 'En progreso'
    case 'waiting_customer':
      return 'Esperando'
    case 'resolved':
      return 'Resuelto'
    case 'closed':
      return 'Cerrado'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'open':
      return 'text-primary'
    case 'in_progress':
      return 'text-warning'
    case 'waiting_customer':
      return 'text-secondary'
    case 'resolved':
      return 'text-success'
    case 'closed':
      return 'text-default-400'
    case 'cancelled':
      return 'text-danger'
    default:
      return 'text-default-400'
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'low':
      return 'Baja'
    case 'medium':
      return 'Media'
    case 'high':
      return 'Alta'
    case 'urgent':
      return 'Urgente'
    default:
      return priority
  }
}

function getPriorityColor(priority: string): 'default' | 'primary' | 'warning' | 'danger' {
  switch (priority) {
    case 'low':
      return 'default'
    case 'medium':
      return 'primary'
    case 'high':
      return 'warning'
    case 'urgent':
      return 'danger'
    default:
      return 'default'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Debounce hook
// ─────────────────────────────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SupportPageClient() {
  const { t } = useTranslation()
  const router = useRouter()

  const [searchInput, setSearchInput] = useState('')
  const [channel, setChannel] = useState<string>('all')
  const [status, setStatus] = useState<string>('open')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const debouncedSearch = useDebouncedValue(searchInput, 400)

  // Reset page when filters change
  const prevSearchRef = useRef(debouncedSearch)

  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      setPage(1)
      prevSearchRef.current = debouncedSearch
    }
  }, [debouncedSearch])

  const filters = {
    search: debouncedSearch || undefined,
    channel: channel !== 'all' ? (channel as TTicketChannel) : undefined,
    status: status !== 'all' ? (status as TTicketStatus) : undefined,
    page,
    limit,
  }

  const { data, isLoading } = useMyTickets({ enabled: true, filters })

  const tickets = data?.data ?? []
  const pagination = data?.pagination

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString('es', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h4">
            {t('resident.support.title') !== 'resident.support.title'
              ? t('resident.support.title')
              : 'Soporte'}
          </Typography>
          <Typography color="muted" variant="body2">
            {t('resident.support.subtitle') !== 'resident.support.subtitle'
              ? t('resident.support.subtitle')
              : 'Gestiona tus solicitudes y consultas'}
          </Typography>
        </div>
        <Button color="primary" href="/dashboard/support/create" startContent={<Plus size={20} />}>
          {t('resident.support.newTicket') !== 'resident.support.newTicket'
            ? t('resident.support.newTicket')
            : 'Nuevo ticket'}
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Buscar por asunto o número..."
            startContent={<Search className="text-default-400" size={18} />}
            value={searchInput}
            variant="bordered"
            onValueChange={setSearchInput}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Canal"
            items={channelItems}
            placeholder="Canal"
            value={channel}
            variant="bordered"
            onChange={key => {
              setChannel(key || 'all')
              setPage(1)
            }}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Estado"
            items={statusItems}
            placeholder="Estado"
            value={status}
            variant="bordered"
            onChange={key => {
              setStatus(key || 'all')
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <MessageSquare className="text-default-300" size={56} />
          <Typography variant="subtitle1">
            {t('resident.support.emptyTitle') !== 'resident.support.emptyTitle'
              ? t('resident.support.emptyTitle')
              : 'No tienes tickets'}
          </Typography>
          <Typography color="muted" variant="body2">
            {t('resident.support.emptyDescription') !== 'resident.support.emptyDescription'
              ? t('resident.support.emptyDescription')
              : 'Crea un nuevo ticket para recibir asistencia'}
          </Typography>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-xl border border-default-200">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                className="flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-default-50 sm:items-center sm:gap-4"
                onClick={() => router.push(`/dashboard/support/${ticket.id}`)}
              >
                {/* Status dot */}
                <Circle
                  className={`mt-1.5 shrink-0 fill-current sm:mt-0 ${getStatusDotColor(ticket.status)}`}
                  size={10}
                />

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2 sm:items-center">
                    <Typography className="line-clamp-2 font-medium sm:truncate sm:line-clamp-none">
                      {ticket.subject}
                    </Typography>
                    <ChevronRight className="mt-0.5 shrink-0 text-default-300 sm:hidden" size={16} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-default-400">
                    <span>#{ticket.ticketNumber}</span>
                    <span>·</span>
                    <span>{getChannelLabel(ticket.channel)}</span>
                    <span>·</span>
                    <span>{getStatusLabel(ticket.status)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 sm:hidden">
                    <Chip color={getPriorityColor(ticket.priority)} size="sm" variant="flat">
                      {getPriorityLabel(ticket.priority)}
                    </Chip>
                    <Typography className="text-xs text-default-400">
                      {formatDate(ticket.createdAt)}
                    </Typography>
                  </div>
                </div>

                {/* Right side (desktop only) */}
                <div className="hidden shrink-0 items-center gap-3 sm:flex">
                  <Chip color={getPriorityColor(ticket.priority)} size="sm" variant="flat">
                    {getPriorityLabel(ticket.priority)}
                  </Chip>
                  <Typography className="text-xs text-default-400">
                    {formatDate(ticket.createdAt)}
                  </Typography>
                  <ChevronRight className="text-default-300" size={16} />
                </div>
              </button>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              limit={limit}
              page={page}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onLimitChange={newLimit => {
                setLimit(newLimit)
                setPage(1)
              }}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
