import { useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import { getHttpClient } from '../client/http-client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IAccountStatementLineItem {
  date: string
  type: 'charge' | 'payment' | 'interest' | 'adjustment'
  description: string
  amount: string
  runningBalance: string
  referenceId: string
}

export interface IAccountStatementAging {
  current: string
  days30: string
  days60: string
  days90Plus: string
}

export interface IAccountStatementData {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumName: string
  from: string
  to: string
  previousBalance: string
  totalCharges: string
  totalPayments: string
  totalInterest: string
  currentBalance: string
  currencySymbol: string | null
  lineItems: IAccountStatementLineItem[]
  aging: IAccountStatementAging
}

export interface IAccountStatementQuery {
  from: string
  to: string
  asOfDate?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const accountStatementKeys = {
  all: ['account-statements'] as const,
  statement: (unitId: string, query: IAccountStatementQuery) =>
    ['account-statements', 'statement', unitId, query] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useAccountStatement(
  unitId: string,
  query: IAccountStatementQuery,
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  if (query.asOfDate) params.set('asOfDate', query.asOfDate)

  return useApiQuery<TApiDataResponse<IAccountStatementData>>({
    path: `/condominium/account-statements/units/${unitId}/statement?${params.toString()}`,
    queryKey: accountStatementKeys.statement(unitId, query),
    enabled: options?.enabled !== false && !!unitId && !!query.from && !!query.to,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side fetch
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccountStatementServer(
  token: string,
  unitId: string,
  query: IAccountStatementQuery,
  condominiumId?: string
): Promise<IAccountStatementData> {
  const client = getHttpClient()
  const params = new URLSearchParams({ from: query.from, to: query.to })
  if (query.asOfDate) params.set('asOfDate', query.asOfDate)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (condominiumId) headers['x-condominium-id'] = condominiumId

  const response = await client.get<TApiDataResponse<IAccountStatementData>>(
    `/condominium/account-statements/units/${unitId}/statement?${params.toString()}`,
    { headers }
  )

  return response.data.data
}
