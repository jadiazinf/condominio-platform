import { useApiQuery, useApiMutation } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

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
  condominiumId: string
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
  condominiumId: string
  balance: string
}

// ─── Query Keys ───

export const billingLedgerKeys = {
  all: ['billing-ledger'] as const,
  statement: (unitId: string, condominiumId: string, from: string, to: string) =>
    [...billingLedgerKeys.all, 'statement', unitId, condominiumId, from, to] as const,
  balance: (unitId: string, condominiumId: string) =>
    [...billingLedgerKeys.all, 'balance', unitId, condominiumId] as const,
  balanceSummary: (unitId: string) =>
    [...billingLedgerKeys.all, 'balance-summary', unitId] as const,
}

// ─── Hooks ───

export function useAccountStatement(
  unitId: string,
  condominiumId: string,
  from: string,
  to: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<IAccountStatement>>({
    path: `/billing/units/${unitId}/statement?condominiumId=${condominiumId}&from=${from}&to=${to}`,
    queryKey: billingLedgerKeys.statement(unitId, condominiumId, from, to),
    config: {},
    enabled: options?.enabled !== false && !!unitId && !!condominiumId && !!from && !!to,
  })
}

export function useUnitBalance(
  unitId: string,
  condominiumId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<IUnitBalance>>({
    path: `/billing/units/${unitId}/balance?condominiumId=${condominiumId}`,
    queryKey: billingLedgerKeys.balance(unitId, condominiumId),
    config: {},
    enabled: options?.enabled !== false && !!unitId && !!condominiumId,
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

// ─── Report Payment Mutation ───

export interface IReportBillingPaymentInput {
  unitId: string
  condominiumId: string
  amount: string
  currencyId: string
  paymentMethod: string
  paymentDate: string
  receiptNumber?: string
  notes?: string
  bankAccountId?: string
}

export function useReportBillingPayment(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<any>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<any>, IReportBillingPaymentInput>({
    path: '/condominium/payments/report',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingLedgerKeys.all, ['billing-charges'], ['billing-receipts'], ['payments']],
  })
}
