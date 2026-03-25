import { useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import { getHttpClient } from '../client/http-client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IDelinquencyUnitAging {
  current: string
  days30: string
  days60: string
  days90Plus: string
}

export interface IDelinquencyUnit {
  unitId: string
  unitNumber: string
  buildingId: string
  buildingName: string
  totalDebt: string
  aging: IDelinquencyUnitAging
  oldestDueDate: string
  overdueQuotaCount: number
  maxDaysOverdue: number
}

export interface IDelinquencySummary {
  totalDelinquent: string
  delinquentUnitCount: number
  totalUnits: number
  collectionRate: string
}

export interface IDelinquencyReportData {
  delinquentUnits: IDelinquencyUnit[]
  summary: IDelinquencySummary
  currencySymbol: string | null
}

export interface IDelinquencyReportQuery {
  asOfDate: string
  buildingId?: string
  conceptId?: string
  unitId?: string
  condominiumId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const delinquencyKeys = {
  all: ['delinquency'] as const,
  report: (query: IDelinquencyReportQuery) => ['delinquency', 'report', query] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useDelinquencyReport(
  query: IDelinquencyReportQuery,
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams({ asOfDate: query.asOfDate })
  if (query.buildingId) params.set('buildingId', query.buildingId)
  if (query.conceptId) params.set('conceptId', query.conceptId)
  if (query.unitId) params.set('unitId', query.unitId)

  const config: Record<string, unknown> = {}
  if (query.condominiumId) {
    config.headers = { 'x-condominium-id': query.condominiumId }
  }

  return useApiQuery<TApiDataResponse<IDelinquencyReportData>>({
    path: `/condominium/account-statements/delinquency?${params.toString()}`,
    queryKey: delinquencyKeys.report(query),
    enabled: options?.enabled !== false && !!query.asOfDate,
    config,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side fetch
// ─────────────────────────────────────────────────────────────────────────────

export async function getDelinquencyReportServer(
  token: string,
  query: IDelinquencyReportQuery,
  condominiumId?: string
): Promise<IDelinquencyReportData> {
  const client = getHttpClient()
  const params = new URLSearchParams({ asOfDate: query.asOfDate })
  if (query.buildingId) params.set('buildingId', query.buildingId)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (condominiumId) headers['x-condominium-id'] = condominiumId

  const response = await client.get<TApiDataResponse<IDelinquencyReportData>>(
    `/condominium/account-statements/delinquency?${params.toString()}`,
    { headers }
  )

  return response.data.data
}
