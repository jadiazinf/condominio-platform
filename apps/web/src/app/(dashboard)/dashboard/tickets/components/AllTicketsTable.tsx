'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { MessageSquare, AlertCircle, Building } from 'lucide-react'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Input } from '@/ui/components/input'
import { Search } from 'lucide-react'
import type { TSupportTicket, TPaginationMeta } from '@packages/domain'

import { Pagination } from '@/ui/components/pagination'
import { useI18n } from '@/contexts'

type TTicketRow = TSupportTicket & { id: string }

interface AllTicketsTableProps {
  tickets: TSupportTicket[]
  pagination: TPaginationMeta
}

export function AllTicketsTable({ tickets, pagination }: AllTicketsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  const statusFilter = searchParams.get('status') || 'all'
  const priorityFilter = searchParams.get('priority') || 'all'
  const searchTerm = searchParams.get('search') || ''

  // Local state for search input with debounce
  const [searchInput, setSearchInput] = useState(searchTerm)
  const isFirstRender = useRef(true)

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('tickets.filters.allStatuses') },
      { key: 'open', label: t('tickets.status.open') },
      { key: 'in_progress', label: t('tickets.status.in_progress') },
      { key: 'waiting_customer', label: t('tickets.status.waiting_customer') },
      { key: 'resolved', label: t('tickets.status.resolved') },
      { key: 'closed', label: t('tickets.status.closed') },
    ],
    [t]
  )

  // Priority filter items
  const priorityFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('tickets.filters.allPriorities') },
      { key: 'urgent', label: t('tickets.priority.urgent') },
      { key: 'high', label: t('tickets.priority.high') },
      { key: 'medium', label: t('tickets.priority.medium') },
      { key: 'low', label: t('tickets.priority.low') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TTicketRow>[] = useMemo(
    () => [
      { key: 'ticketNumber', label: t('tickets.table.ticket').toUpperCase() },
      { key: 'company', label: t('tickets.table.company').toUpperCase() },
      { key: 'subject', label: t('tickets.table.subject').toUpperCase() },
      { key: 'category', label: t('tickets.table.category').toUpperCase() },
      { key: 'priority', label: t('tickets.table.priority').toUpperCase() },
      { key: 'status', label: t('tickets.table.status').toUpperCase() },
      { key: 'createdAt', label: t('tickets.table.created').toUpperCase() },
    ],
    [t]
  )

  // Sync local state with URL params when they change externally
  useEffect(() => {
    setSearchInput(searchTerm)
  }, [searchTerm])

  // Debounce search input
  useEffect(() => {
    // Skip first render to avoid initial fetch
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      updateFilters({ search: searchInput })
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const updateFilters = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      // Reset to page 1 when filters change (except when changing page or limit)
      if (!('page' in updates) && !('limit' in updates)) {
        params.delete('page')
      }

      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
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
    const key = `tickets.status.${status.toLowerCase()}`
    const translation = t(key)
    return translation !== key ? translation : status
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
    const key = `tickets.priority.${priority.toLowerCase()}`
    const translation = t(key)
    return translation !== key ? translation : priority
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return t('tickets.category.general')
    const key = `tickets.category.${category.toLowerCase()}`
    const translation = t(key)
    return translation !== key ? translation : category
  }

  const handleViewTicket = useCallback(
    (ticketId: string) => {
      router.push(`/dashboard/tickets/${ticketId}`)
    },
    [router]
  )

  const renderCell = useCallback(
    (ticket: TTicketRow, columnKey: keyof TTicketRow | string) => {
      switch (columnKey) {
        case 'ticketNumber':
          return (
            <div className="flex items-center gap-2">
              <AlertCircle
                className={
                  ticket.priority === 'urgent' || ticket.priority === 'high'
                    ? 'text-danger'
                    : 'text-default-400'
                }
                size={18}
              />
              <p className="font-mono text-sm font-medium">{ticket.ticketNumber}</p>
            </div>
          )
        case 'company':
          return (
            <div className="flex items-center gap-2">
              <Building className="text-default-400" size={16} />
              <div>
                <p className="text-sm font-medium text-default-900">
                  {ticket.managementCompany?.name || 'N/A'}
                </p>
                <p className="text-xs text-default-400">
                  {ticket.managementCompany?.legalName || ''}
                </p>
              </div>
            </div>
          )
        case 'subject':
          return (
            <div>
              <p className="text-sm font-medium text-default-900">{ticket.subject}</p>
              <p className="text-xs text-default-400">
                {ticket.description.length > 60
                  ? `${ticket.description.substring(0, 60)}...`
                  : ticket.description}
              </p>
            </div>
          )
        case 'category':
          return <p className="text-sm text-default-600">{getCategoryLabel(ticket.category)}</p>
        case 'priority':
          return (
            <Chip color={getPriorityColor(ticket.priority)} variant="flat">
              {getPriorityLabel(ticket.priority)}
            </Chip>
          )
        case 'status':
          return (
            <Chip color={getStatusColor(ticket.status)} variant="flat">
              {getStatusLabel(ticket.status)}
            </Chip>
          )
        case 'createdAt':
          return <p className="text-sm text-default-600">{formatDate(ticket.createdAt)}</p>
        default:
          return null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <Input
          className="max-w-md"
          placeholder={t('tickets.search')}
          startContent={<Search size={18} />}
          value={searchInput}
          onValueChange={setSearchInput}
        />
        <div className="flex gap-2">
          <Select
            className="w-48"
            label={t('tickets.filters.status')}
            placeholder={t('tickets.filters.status')}
            items={statusFilterItems}
            value={statusFilter}
            onChange={key => updateFilters({ status: key || 'all' })}
          />

          <Select
            className="w-48"
            label={t('tickets.filters.priority')}
            placeholder={t('tickets.filters.priority')}
            items={priorityFilterItems}
            value={priorityFilter}
            onChange={key => updateFilters({ priority: key || 'all' })}
          />
        </div>
      </div>

      {tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <MessageSquare className="mb-4 text-default-400" size={48} />
          <h3 className="text-lg font-semibold text-default-700">{t('tickets.empty')}</h3>
          <p className="mt-1 text-sm text-default-500">{t('tickets.emptyDescription')}</p>
        </div>
      )}

      {tickets.length > 0 && (
        <>
          {/* Mobile Cards View */}
          <div className="block space-y-3 md:hidden">
            {tickets.map(ticket => (
              <Card
                key={ticket.id}
                className="cursor-pointer transition-all hover:shadow-md"
                isPressable
                onPress={() => handleViewTicket(ticket.id)}
              >
                <CardBody className="h-48 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <AlertCircle
                        className={
                          ticket.priority === 'urgent' || ticket.priority === 'high'
                            ? 'text-danger'
                            : 'text-default-400'
                        }
                        size={18}
                      />
                      <p className="font-mono text-sm font-medium truncate">
                        {ticket.ticketNumber}
                      </p>
                    </div>
                    <Chip color={getStatusColor(ticket.status)} variant="flat">
                      {getStatusLabel(ticket.status)}
                    </Chip>
                  </div>

                  <div className="flex-1 min-h-0">
                    <p className="text-sm font-semibold text-default-900 truncate">
                      {ticket.subject}
                    </p>
                    <p className="mt-1 text-xs text-default-400 line-clamp-2">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-default-500 truncate">
                    <Building size={14} className="flex-shrink-0" />
                    <span className="truncate">{ticket.managementCompany?.name || 'N/A'}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <Chip color={getPriorityColor(ticket.priority)} variant="dot">
                      {getPriorityLabel(ticket.priority)}
                    </Chip>
                    <Chip variant="flat">{getCategoryLabel(ticket.category)}</Chip>
                    <span className="text-xs text-default-400 ml-auto">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table<TTicketRow>
              aria-label="Tabla de todos los tickets de soporte"
              columns={tableColumns}
              rows={tickets}
              renderCell={renderCell}
              onRowClick={ticket => handleViewTicket(ticket.id)}
              classNames={{
                tr: 'cursor-pointer transition-colors hover:bg-default-100',
              }}
            />
          </div>

          {/* Pagination */}
          <Pagination
            limit={pagination.limit}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={limit => updateFilters({ limit })}
            onPageChange={page => updateFilters({ page })}
          />
        </>
      )}
    </div>
  )
}
