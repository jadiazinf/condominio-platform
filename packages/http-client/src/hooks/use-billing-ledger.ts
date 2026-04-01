import { useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'

// ─── Types ───

export interface IStatementEntry {
  date: string
  description: string | null
  debit: string | null
  credit: string | null
  balance: string
  referenceType: string
  referenceId: string
}

export interface IAging {
  current: string
  days30: string
  days60: string
  days90Plus: string
}

export interface IAccountStatement {
  unitId: string
  billingChannelId: string
  fromDate: string
  toDate: string
  initialBalance: string
  entries: IStatementEntry[]
  currentBalance: string
  totalDebits: string
  totalCredits: string
  aging: IAging
}

export interface IUnitBalance {
  unitId: string
  billingChannelId: string
  balance: string
}

// ─── Query Keys ───

export const billingLedgerKeys = {
  all: ['billing-ledger'] as const,
  statement: (unitId: string, channelId: string, from: string, to: string) =>
    [...billingLedgerKeys.all, 'statement', unitId, channelId, from, to] as const,
  balance: (unitId: string, channelId: string) =>
    [...billingLedgerKeys.all, 'balance', unitId, channelId] as const,
  balanceSummary: (unitId: string) =>
    [...billingLedgerKeys.all, 'balance-summary', unitId] as const,
}

// ─── Hooks ───

export function useAccountStatement(
  unitId: string,
  channelId: string,
  from: string,
  to: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<IAccountStatement>>({
    path: `/billing/units/${unitId}/statement?channelId=${channelId}&from=${from}&to=${to}`,
    queryKey: billingLedgerKeys.statement(unitId, channelId, from, to),
    config: {},
    enabled: options?.enabled !== false && !!unitId && !!channelId && !!from && !!to,
  })
}

export function useUnitBalance(
  unitId: string,
  channelId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<IUnitBalance>>({
    path: `/billing/units/${unitId}/balance?channelId=${channelId}`,
    queryKey: billingLedgerKeys.balance(unitId, channelId),
    config: {},
    enabled: options?.enabled !== false && !!unitId && !!channelId,
  })
}

export function useUnitBalanceSummary(unitId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<any>>({
    path: `/billing/units/${unitId}/balance-summary`,
    queryKey: billingLedgerKeys.balanceSummary(unitId),
    config: {},
    enabled: options?.enabled !== false && !!unitId,
  })
}
