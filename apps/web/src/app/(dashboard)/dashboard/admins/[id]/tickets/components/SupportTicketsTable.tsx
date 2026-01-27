'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from '@heroui/table'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { Plus, MessageSquare, AlertCircle, Search } from 'lucide-react'
import { Select, SelectItem } from '@heroui/select'
import { Input } from '@heroui/input'
import type { TSupportTicket, TPaginationMeta } from '@packages/domain'

import { Pagination } from '@/ui/components/pagination'
import { useI18n } from '@/contexts'

interface SupportTicketsTableProps {
  companyId: string
  tickets: TSupportTicket[]
  pagination: TPaginationMeta
}

export function SupportTicketsTable({ companyId, tickets, pagination }: SupportTicketsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  const statusFilter = searchParams.get('status') || 'all'
  const priorityFilter = searchParams.get('priority') || 'all'
  const searchTerm = searchParams.get('search') || ''

  // Local state for search input with debounce
  const [searchInput, setSearchInput] = useState(searchTerm)
  const isFirstRender = useRef(true)

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

  const updateFilters = (updates: Record<string, string | number | null>) => {
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
  }

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
    return t(`tickets.status.${status.toLowerCase()}` as any) || status
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
    return t(`tickets.priority.${priority.toLowerCase()}` as any) || priority
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return t('tickets.category.general')
    return t(`tickets.category.${category.toLowerCase()}` as any) || category
  }

  const handleViewTicket = (ticketId: string) => {
    router.push(`/dashboard/tickets/${ticketId}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <Input
          className="max-w-md"
          placeholder={t('tickets.search')}
          size="sm"
          startContent={<Search size={18} />}
          value={searchInput}
          onValueChange={setSearchInput}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
          <Select
            className="w-48"
            label={t('tickets.filters.status')}
            placeholder={t('tickets.filters.status')}
            selectedKeys={[statusFilter]}
            size="sm"
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string
              updateFilters({ status: value || 'all' })
            }}
          >
            <SelectItem key="all">{t('tickets.filters.allStatuses')}</SelectItem>
            <SelectItem key="open">{t('tickets.status.open')}</SelectItem>
            <SelectItem key="in_progress">{t('tickets.status.in_progress')}</SelectItem>
            <SelectItem key="waiting_customer">{t('tickets.status.waiting_customer')}</SelectItem>
            <SelectItem key="resolved">{t('tickets.status.resolved')}</SelectItem>
            <SelectItem key="closed">{t('tickets.status.closed')}</SelectItem>
          </Select>

          <Select
            className="w-48"
            label={t('tickets.filters.priority')}
            placeholder={t('tickets.filters.priority')}
            selectedKeys={[priorityFilter]}
            size="sm"
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string
              updateFilters({ priority: value || 'all' })
            }}
          >
            <SelectItem key="all">{t('tickets.filters.allPriorities')}</SelectItem>
            <SelectItem key="urgent">{t('tickets.priority.urgent')}</SelectItem>
            <SelectItem key="high">{t('tickets.priority.high')}</SelectItem>
            <SelectItem key="medium">{t('tickets.priority.medium')}</SelectItem>
            <SelectItem key="low">{t('tickets.priority.low')}</SelectItem>
          </Select>
        </div>

          <Button
            color="primary"
            size="sm"
            startContent={<Plus size={16} />}
          >
            {t('tickets.create')}
          </Button>
        </div>
      </div>

      {tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <MessageSquare className="mb-4 text-default-400" size={48} />
          <h3 className="text-lg font-semibold text-default-700">
            {t('tickets.empty')}
          </h3>
          <p className="mt-1 text-sm text-default-500">
            {t('tickets.emptyDescription')}
          </p>
          {pagination.page === 1 && (
            <Button
              className="mt-4"
              color="primary"
              size="sm"
              startContent={<Plus size={16} />}
            >
              {t('tickets.create')}
            </Button>
          )}
        </div>
      )}

      {tickets.length > 0 && (
        <>
          {/* Mobile Cards View */}
          <div className="block space-y-3 md:hidden">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer transition-all hover:shadow-md"
                isPressable
                onPress={() => handleViewTicket(ticket.id)}
              >
                <CardBody className="h-44 space-y-3">
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
                    <Chip
                      color={getStatusColor(ticket.status)}
                      size="sm"
                      variant="flat"
                    >
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

                  <div className="flex flex-wrap gap-2 items-center">
                    <Chip
                      color={getPriorityColor(ticket.priority)}
                      size="sm"
                      variant="dot"
                    >
                      {getPriorityLabel(ticket.priority)}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      {getCategoryLabel(ticket.category)}
                    </Chip>
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
            <Table aria-label="Tabla de tickets de soporte">
              <TableHeader>
                <TableColumn>{t('tickets.table.ticket').toUpperCase()}</TableColumn>
                <TableColumn>{t('tickets.table.subject').toUpperCase()}</TableColumn>
                <TableColumn>{t('tickets.table.category').toUpperCase()}</TableColumn>
                <TableColumn>{t('tickets.table.priority').toUpperCase()}</TableColumn>
                <TableColumn>{t('tickets.table.status').toUpperCase()}</TableColumn>
                <TableColumn>{t('tickets.table.created').toUpperCase()}</TableColumn>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer transition-colors hover:bg-default-100"
                    onClick={() => handleViewTicket(ticket.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertCircle
                          className={
                            ticket.priority === 'urgent' || ticket.priority === 'high'
                              ? 'text-danger'
                              : 'text-default-400'
                          }
                          size={18}
                        />
                        <p className="font-mono text-sm font-medium">
                          {ticket.ticketNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-default-900">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-default-400">
                          {ticket.description.length > 60
                            ? `${ticket.description.substring(0, 60)}...`
                            : ticket.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-default-600">
                        {getCategoryLabel(ticket.category)}
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
                      <p className="text-sm text-default-600">
                        {formatDate(ticket.createdAt)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <Pagination
            limit={pagination.limit}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={(limit) => updateFilters({ limit })}
            onPageChange={(page) => updateFilters({ page })}
          />
        </>
      )}
    </div>
  )
}
