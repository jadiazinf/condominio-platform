import { useApiQuery } from './use-api-query'
import type { TApiPaginatedResponse, TApiDataResponse } from '../types/api-responses'
import type { TEventLog } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const eventLogKeys = {
  all: ['event-logs'] as const,
  lists: () => [...eventLogKeys.all, 'list'] as const,
  list: (query: IEventLogsQuery) => [...eventLogKeys.lists(), query] as const,
  detail: (id: string) => [...eventLogKeys.all, 'detail', id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IEventLogsQuery {
  page?: number
  limit?: number
  category?: string
  level?: string
  result?: string
  source?: string
  entityType?: string
  entityId?: string
  event?: string
  dateFrom?: string
  dateTo?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Event Logs (Paginated) — Condominium scoped
// ─────────────────────────────────────────────────────────────────────────────

export function useEventLogsPaginated(options?: { query?: IEventLogsQuery; enabled?: boolean }) {
  const { query = {}, enabled = true } = options ?? {}

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.category) params.set('category', query.category)
  if (query.level) params.set('level', query.level)
  if (query.result) params.set('result', query.result)
  if (query.source) params.set('source', query.source)
  if (query.entityType) params.set('entityType', query.entityType)
  if (query.entityId) params.set('entityId', query.entityId)
  if (query.event) params.set('event', query.event)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const queryString = params.toString()
  const path = `/condominium/event-logs${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TEventLog>>({
    path,
    queryKey: eventLogKeys.list(query),
    config: {},
    enabled,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Event Log by ID (platform scope)
// ─────────────────────────────────────────────────────────────────────────────

export function useEventLogDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TEventLog>>({
    path: `/platform/event-logs/${id}`,
    queryKey: eventLogKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}
