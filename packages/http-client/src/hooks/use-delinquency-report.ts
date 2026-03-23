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
  buildingName: string
  totalDebt: string
  aging: IDelinquencyUnitAging
  oldestDueDate: string
  overdueQuotaCount: number
}

export interface IDelinquencySummary {
  totalDelinquent: string
  delinquentUnitCount: number
  totalUnits: number
  collectionRate: string
}

export interface IDelinquencyReportData {
  units: IDelinquencyUnit[]
  summary: IDelinquencySummary
}

export interface IDelinquencyReportQuery {
  asOfDate: string
  buildingId?: string
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

  return useApiQuery<TApiDataResponse<IDelinquencyReportData>>({
    path: `/condominium/account-statements/delinquency?${params.toString()}`,
    queryKey: delinquencyKeys.report(query),
    enabled: options?.enabled !== false && !!query.asOfDate,
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
