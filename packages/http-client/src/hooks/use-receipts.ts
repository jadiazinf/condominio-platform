'use client'
import { useCallback, useState } from 'react'
import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TCondominiumReceipt, TCondominiumReceiptUpdate } from '@packages/domain'
import { getEnvConfig } from '../config/env'

// ─────────────────────────────────────────────────────────────────────────────
// Internal: auth & context getters for direct fetch (PDF download)
// ─────────────────────────────────────────────────────────────────────────────

let receiptAuthTokenGetter: (() => string | null | Promise<string | null>) | null = null
let receiptCondominiumIdGetter: (() => string | null | Promise<string | null>) | null = null

export function setReceiptDownloadAuth(
  tokenGetter: () => string | null | Promise<string | null>,
  condominiumIdGetter: () => string | null | Promise<string | null>
): void {
  receiptAuthTokenGetter = tokenGetter
  receiptCondominiumIdGetter = condominiumIdGetter
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type IReceiptWithItems = TCondominiumReceipt

export interface IGenerateReceiptInput {
  unitId: string
  periodYear: number
  periodMonth: number
  currencyId: string
  budgetId?: string | null
}

export interface IBulkGenerateInput {
  periodYear: number
  periodMonth: number
  currencyId: string
  budgetId?: string | null
}

export interface IBulkGenerateResult {
  generated: number
  failed: number
  total: number
  errors: Array<{ unitId: string; unitNumber: string; error: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  byPeriod: (year: number, month: number) => [...receiptKeys.all, 'period', year, month] as const,
  byUnit: (unitId: string) => [...receiptKeys.all, 'unit', unitId] as const,
  details: () => [...receiptKeys.all, 'detail'] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Receipts
// ─────────────────────────────────────────────────────────────────────────────

export function useReceipts(options?: {
  periodYear?: number
  periodMonth?: number
  unitId?: string
  enabled?: boolean
}) {
  const params = new URLSearchParams()
  if (options?.periodYear) params.set('periodYear', String(options.periodYear))
  if (options?.periodMonth) params.set('periodMonth', String(options.periodMonth))
  if (options?.unitId) params.set('unitId', options.unitId)
  const qs = params.toString()
  const path = `/condominium/receipts${qs ? `?${qs}` : ''}`

  return useApiQuery<TApiDataResponse<TCondominiumReceipt[]>>({
    path,
    queryKey: options?.unitId
      ? receiptKeys.byUnit(options.unitId)
      : options?.periodYear && options?.periodMonth
        ? receiptKeys.byPeriod(options.periodYear, options.periodMonth)
        : receiptKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Receipt Detail (with items)
// ─────────────────────────────────────────────────────────────────────────────

export function useReceiptDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<IReceiptWithItems>>({
    path: `/condominium/receipts/${id}`,
    queryKey: receiptKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Generate Receipt
// ─────────────────────────────────────────────────────────────────────────────

export interface IGenerateReceiptOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumReceipt>>) => void
  onError?: (error: Error) => void
}

export function useGenerateReceipt(options?: IGenerateReceiptOptions) {
  return useApiMutation<TApiDataResponse<TCondominiumReceipt>, IGenerateReceiptInput>({
    path: '/condominium/receipts/generate',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [receiptKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Bulk Generate Receipts
// ─────────────────────────────────────────────────────────────────────────────

export interface IBulkGenerateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IBulkGenerateResult>>) => void
  onError?: (error: Error) => void
}

export function useBulkGenerateReceipts(options?: IBulkGenerateOptions) {
  return useApiMutation<TApiDataResponse<IBulkGenerateResult>, IBulkGenerateInput>({
    path: '/condominium/receipts/bulk-generate',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [receiptKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Void Receipt
// ─────────────────────────────────────────────────────────────────────────────

export interface IVoidReceiptOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumReceipt>>) => void
  onError?: (error: Error) => void
}

export function useVoidReceipt(options?: IVoidReceiptOptions) {
  return useApiMutation<TApiDataResponse<TCondominiumReceipt>, { id: string }>({
    path: data => `/condominium/receipts/${data.id}/void`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [receiptKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Receipt
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateReceipt(
  id: string,
  options?: {
    onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumReceipt>>) => void
    onError?: (error: Error) => void
  }
) {
  return useApiMutation<TApiDataResponse<TCondominiumReceipt>, TCondominiumReceiptUpdate>({
    path: `/condominium/receipts/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [receiptKeys.all, receiptKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Send Receipt Email
// ─────────────────────────────────────────────────────────────────────────────

export interface ISendReceiptResult {
  sent: number
  total: number
}

export function useSendReceipt(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<ISendReceiptResult>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<ISendReceiptResult>, { id: string }>({
    path: data => `/condominium/receipts/${data.id}/send`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [receiptKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Download
// ─────────────────────────────────────────────────────────────────────────────

export function useDownloadReceiptPdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(async (receiptId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DOM APIs accessed via globalThis to avoid requiring "dom" lib in non-browser tsconfigs
    const win = globalThis as any
    if (!win.window) return

    setIsDownloading(true)
    try {
      const { apiBaseUrl } = getEnvConfig()
      const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl

      const headers: Record<string, string> = {}

      if (receiptAuthTokenGetter) {
        const token = await receiptAuthTokenGetter()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      }

      if (receiptCondominiumIdGetter) {
        const condominiumId = await receiptCondominiumIdGetter()
        if (condominiumId) {
          headers['x-condominium-id'] = condominiumId
        }
      }

      const response = await fetch(`${normalizedBase}/condominium/receipts/${receiptId}/pdf`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Error descargando el PDF del recibo')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="?(.+?)"?$/)
      const filename = filenameMatch?.[1] ?? `recibo-${receiptId}.pdf`

      const url: string = win.URL.createObjectURL(blob)
      const a = win.document.createElement('a')
      a.href = url
      a.download = filename
      win.document.body.appendChild(a)
      a.click()
      win.document.body.removeChild(a)
      win.URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  return { download, isDownloading }
}
