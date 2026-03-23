import { useApiQuery, useApiMutation } from './use-api-query'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const bankReconciliationKeys = {
  all: ['bank-reconciliation'] as const,
  imports: (bankAccountId: string) =>
    [...bankReconciliationKeys.all, 'imports', bankAccountId] as const,
  importEntries: (importId: string) =>
    [...bankReconciliationKeys.all, 'entries', importId] as const,
  reconciliations: () => [...bankReconciliationKeys.all, 'reconciliations'] as const,
  reconciliation: (id: string) => [...bankReconciliationKeys.all, 'reconciliation', id] as const,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IColumnMapping {
  transactionDate: string
  reference: string
  description: string
  amount: string
  entryType?: string
  valueDate?: string
  balance?: string
}

export interface IImportBankStatementInput {
  bankAccountId: string
  filename: string
  csvContent: string
  columnMapping: IColumnMapping
}

export interface IImportBankStatementResult {
  importId: string
  totalEntries: number
  totalCredits: string
  totalDebits: string
  skippedRows: number
  periodFrom: string
  periodTo: string
}

export interface IBankStatementImport {
  id: string
  bankAccountId: string
  filename: string
  importedBy: string | null
  periodFrom: string
  periodTo: string
  totalEntries: number
  totalCredits: string
  totalDebits: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
}

export interface IBankStatementEntry {
  id: string
  importId: string
  transactionDate: string
  valueDate: string | null
  reference: string | null
  description: string | null
  amount: string
  entryType: 'credit' | 'debit'
  balance: string | null
  status: 'unmatched' | 'matched' | 'ignored'
  matchedAt: string | null
  createdAt: string
}

export interface IAutoMatchResult {
  matched: number
  unmatched: number
  matches: Array<{
    entryId: string
    paymentId: string
    matchType: string
    confidence: string
  }>
}

export interface IManualMatchInput {
  entryId: string
  paymentId: string
  notes?: string
}

export interface IBankReconciliation {
  id: string
  bankAccountId: string
  condominiumId: string
  periodFrom: string
  periodTo: string
  status: 'in_progress' | 'completed' | 'cancelled'
  totalMatched: number
  totalUnmatched: number
  totalIgnored: number
  reconciledBy: string | null
  reconciledAt: string | null
  createdAt: string
}

export interface ICreateReconciliationInput {
  bankAccountId: string
  periodFrom: string
  periodTo: string
  notes?: string
}

export interface IReconciliationSummary {
  reconciliation: IBankReconciliation
  totalMatched: number
  totalUnmatched: number
  totalIgnored: number
  totalCredits: string
  totalDebits: string
  unmatchedEntries: IBankStatementEntry[]
  matches: Array<{
    id: string
    entryId: string
    paymentId: string
    matchType: string
    confidence: string | null
  }>
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBankStatementImports(bankAccountId: string) {
  return useApiQuery<{ data: IBankStatementImport[] }>({
    path: `/condominium/bank-reconciliation/imports?bankAccountId=${bankAccountId}`,
    queryKey: bankReconciliationKeys.imports(bankAccountId),
    enabled: !!bankAccountId,
  })
}

export function useBankStatementEntries(importId: string) {
  return useApiQuery<{ data: IBankStatementEntry[] }>({
    path: `/condominium/bank-reconciliation/imports/${importId}/entries`,
    queryKey: bankReconciliationKeys.importEntries(importId),
    enabled: !!importId,
  })
}

export function useBankReconciliations() {
  return useApiQuery<{ data: IBankReconciliation[] }>({
    path: '/condominium/bank-reconciliation/reconciliations',
    queryKey: bankReconciliationKeys.reconciliations(),
  })
}

export function useBankReconciliationDetail(id: string) {
  return useApiQuery<{ data: IReconciliationSummary }>({
    path: `/condominium/bank-reconciliation/reconciliations/${id}`,
    queryKey: bankReconciliationKeys.reconciliation(id),
    enabled: !!id,
  })
}

export function useImportBankStatement() {
  return useApiMutation<{ data: IImportBankStatementResult }, IImportBankStatementInput>({
    path: '/condominium/bank-reconciliation/import',
    method: 'POST',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}

export function useAutoMatch() {
  return useApiMutation<{ data: IAutoMatchResult }, { importId: string }>({
    path: vars => `/condominium/bank-reconciliation/imports/${vars.importId}/auto-match`,
    method: 'POST',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}

export function useManualMatch() {
  return useApiMutation<{ data: unknown }, IManualMatchInput>({
    path: '/condominium/bank-reconciliation/match',
    method: 'POST',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}

export function useUnmatchEntry() {
  return useApiMutation<{ data: unknown }, { entryId: string }>({
    path: vars => `/condominium/bank-reconciliation/match/${vars.entryId}`,
    method: 'DELETE',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}

export function useIgnoreEntry() {
  return useApiMutation<{ data: unknown }, { entryId: string }>({
    path: vars => `/condominium/bank-reconciliation/entries/${vars.entryId}/ignore`,
    method: 'PATCH',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}

export function useCreateReconciliation() {
  return useApiMutation<{ data: IBankReconciliation }, ICreateReconciliationInput>({
    path: '/condominium/bank-reconciliation/reconciliations',
    method: 'POST',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}

export function useCompleteReconciliation() {
  return useApiMutation<{ data: unknown }, { reconciliationId: string }>({
    path: vars =>
      `/condominium/bank-reconciliation/reconciliations/${vars.reconciliationId}/complete`,
    method: 'POST',
    invalidateKeys: [bankReconciliationKeys.all],
  })
}
